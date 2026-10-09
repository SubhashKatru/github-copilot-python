"""Randomized Sudoku solution and unique-puzzle generation."""

import copy
import random
from collections.abc import MutableSequence

from .config import DEFAULT_CLUES, EMPTY, MAX_CLUES, MIN_CLUES, SIZE
from .solver import count_solutions
from .validator import is_valid_move

Board = MutableSequence[MutableSequence[int]]


def deep_copy(board: Board) -> list[list[int]]:
    """Return an independent deep copy of a Sudoku board."""
    return copy.deepcopy(board)


def create_empty_board() -> list[list[int]]:
    """Create a new 9x9 board filled with empty cells."""
    return [[EMPTY for _ in range(SIZE)] for _ in range(SIZE)]


def is_safe(board: Board, row: int, column: int, value: int) -> bool:
    """Return whether a value can be placed at a cell without conflicts."""
    return is_valid_move(board, row, column, value)


def fill_board(board: Board) -> bool:
    """Fill the supplied board in place with a randomized valid solution."""
    for row in range(SIZE):
        for column in range(SIZE):
            if board[row][column] == EMPTY:
                candidates = list(range(1, SIZE + 1))
                random.shuffle(candidates)
                for value in candidates:
                    if is_safe(board, row, column, value):
                        board[row][column] = value
                        if fill_board(board):
                            return True
                        board[row][column] = EMPTY
                return False
    return True


def remove_cells(board: Board, clues: int) -> None:
    """Remove cells in place while preserving a unique solution.

    Raises:
        ValueError: If ``clues`` is outside the supported range.
        RuntimeError: If the requested clue count cannot be reached uniquely.
    """
    if not 0 <= clues <= MAX_CLUES:
        raise ValueError(f"Clues must be between 0 and {MAX_CLUES}")
    filled = [
        (row, column)
        for row in range(SIZE)
        for column in range(SIZE)
        if board[row][column] != EMPTY
    ]
    remaining_clues = len(filled)
    random.shuffle(filled)
    for row, column in filled:
        if remaining_clues <= clues:
            break
        original = board[row][column]
        board[row][column] = EMPTY
        if count_solutions(board, limit=2) == 1:
            remaining_clues -= 1
        else:
            board[row][column] = original
    if remaining_clues != clues:
        raise RuntimeError("Unable to generate a unique puzzle with the requested clues")


def generate_puzzle(clues: int = DEFAULT_CLUES) -> tuple[list[list[int]], list[list[int]]]:
    """Generate a randomized puzzle with exactly one solution.

    Args:
        clues: Number of initially filled cells, from 17 through 81.

    Returns:
        A pair containing the puzzle and its complete solution.

    Raises:
        ValueError: If the requested clue count cannot define a unique puzzle.
        RuntimeError: If a complete solution or requested unique puzzle cannot be generated.
    """
    if not MIN_CLUES <= clues <= MAX_CLUES:
        raise ValueError(f"Clues must be between {MIN_CLUES} and {MAX_CLUES}")
    solution = create_empty_board()
    if not fill_board(solution):
        raise RuntimeError("Unable to generate a complete Sudoku solution")
    puzzle = deep_copy(solution)
    try:
        remove_cells(puzzle, clues)
    except RuntimeError:
        raise RuntimeError("Unable to generate a unique puzzle with the requested clues")
    return puzzle, solution
