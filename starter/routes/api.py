"""Flask API Blueprint for Sudoku game operations."""

import logging
import random
from typing import Any

from flask import Blueprint, Response, current_app, jsonify, render_template, request

if __package__ and "." in __package__:
    from .. import sudoku_logic
    from ..sudoku.config import DEFAULT_CLUES, SIZE
    from ..sudoku.validator import is_valid_board_shape, is_valid_value
else:
    import sudoku_logic
    from sudoku.config import DEFAULT_CLUES, SIZE
    from sudoku.validator import is_valid_board_shape, is_valid_value

logger = logging.getLogger(__name__)
api = Blueprint("api", __name__)


def _game_state() -> dict[str, Any]:
    """Return the game state registered on the active Flask application."""
    return current_app.extensions["sudoku_current"]


def _validated_board(value: object) -> list[list[int]] | None:
    """Return a normalized board when the JSON value is a valid Sudoku board."""
    if not is_valid_board_shape(value):
        return None
    board: list[list[int]] = []
    for row in value:
        normalized_row: list[int] = []
        for cell in row:
            if not is_valid_value(cell):
                return None
            normalized_row.append(cell)
        board.append(normalized_row)
    return board


@api.get("/")
def index() -> str:
    """Render the Sudoku game page."""
    return render_template("index.html")


@api.get("/new")
def new_game() -> Response | tuple[Response, int]:
    """Generate and store a new puzzle."""
    raw_clues = request.args.get("clues", str(DEFAULT_CLUES))
    try:
        clues = int(raw_clues)
        puzzle, solution = sudoku_logic.generate_puzzle(clues)
    except (TypeError, ValueError) as error:
        return jsonify({"error": str(error) or "Clue count must be an integer"}), 400
    except Exception:
        logger.exception("Failed to generate a Sudoku puzzle")
        return jsonify({"error": "Unable to generate a puzzle"}), 500
    _game_state().update(puzzle=puzzle, solution=solution)
    return jsonify({"puzzle": puzzle})


@api.post("/check")
def check_solution() -> Response | tuple[Response, int]:
    """Return coordinates of user entries that differ from the solution."""
    state = _game_state()
    solution = state.get("solution")
    if solution is None:
        return jsonify({"error": "No game in progress"}), 400
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Request body must be a JSON object"}), 400
    board = _validated_board(data.get("board"))
    if board is None:
        return jsonify({"error": "Board must be a 9x9 grid of integers from 0 to 9"}), 400
    incorrect = [
        [row, column]
        for row in range(SIZE)
        for column in range(SIZE)
        if board[row][column] != solution[row][column]
    ]
    return jsonify({"incorrect": incorrect})


@api.post("/hint")
def get_hint() -> Response | tuple[Response, int]:
    """Return one correct value for a currently empty puzzle cell."""
    state = _game_state()
    puzzle = state.get("puzzle")
    solution = state.get("solution")
    if puzzle is None or solution is None:
        return jsonify({"error": "No game in progress"}), 400
    board_data = request.get_json(silent=True)
    if board_data is None:
        board = [list(row) for row in puzzle]
    elif isinstance(board_data, dict):
        board = _validated_board(board_data.get("board"))
        if board is None:
            return jsonify({"error": "Board must be a 9x9 grid of integers from 0 to 9"}), 400
    else:
        return jsonify({"error": "Request body must be a JSON object"}), 400
    candidates = [
        (row, column)
        for row in range(SIZE)
        for column in range(SIZE)
        if puzzle[row][column] == 0 and board[row][column] == 0
    ]
    if not candidates:
        return jsonify({"error": "No hint is available"}), 400
    row, column = random.choice(candidates)
    return jsonify({"row": row, "col": column, "value": solution[row][column]})
