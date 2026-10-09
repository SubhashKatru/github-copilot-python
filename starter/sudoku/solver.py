"""Backtracking solver and solution counting for Sudoku."""

from collections.abc import MutableSequence, Sequence

from .config import BOX_SIZE, EMPTY, SIZE
from .validator import (
    is_valid_box,
    is_valid_column,
    is_valid_move,
    is_valid_row,
    is_valid_value,
)

Board = MutableSequence[MutableSequence[int]]


def _find_empty(board: Sequence[Sequence[int]]) -> tuple[int, int] | None:
    """Return the empty cell with the fewest legal candidates."""
    best: tuple[int, int] | None = None
    best_candidates: list[int] | None = None
    for row in range(SIZE):
        for column in range(SIZE):
            if board[row][column] != EMPTY:
                continue
            candidates = [
                value for value in range(1, SIZE + 1)
                if is_valid_move(board, row, column, value)
            ]
            if best_candidates is None or len(candidates) < len(best_candidates):
                best = (row, column)
                best_candidates = candidates
                if not candidates:
                    return best
    return best


def solve_board(board: Board) -> bool:
    """Solve a board in place, returning whether a solution was found."""
    cell = _find_empty(board)
    if cell is None:
        return True
    row, column = cell
    for value in range(1, SIZE + 1):
        if is_valid_move(board, row, column, value):
            board[row][column] = value
            if solve_board(board):
                return True
            board[row][column] = EMPTY
    return False


def count_solutions(board: Sequence[Sequence[int]], limit: int = 2) -> int:
    """Count solutions up to ``limit`` without modifying the input board."""
    if limit < 1:
        raise ValueError("Solution limit must be at least 1")
    if (
        len(board) != SIZE
        or any(len(row) != SIZE for row in board)
        or any(not is_valid_value(value) for row in board for value in row)
        or any(not is_valid_row(row) for row in board)
        or any(not is_valid_column(board, column) for column in range(SIZE))
        or any(
            not is_valid_box(board, row, column)
            for row in range(0, SIZE, BOX_SIZE)
            for column in range(0, SIZE, BOX_SIZE)
        )
    ):
        return 0

    working: list[list[int]] = [list(row) for row in board]

    def search() -> int:
        """Count completions using backtracking, stopping at the limit."""
        cell = _find_empty(working)
        if cell is None:
            return 1
        row, column = cell
        total = 0
        for value in range(1, SIZE + 1):
            if is_valid_move(working, row, column, value):
                working[row][column] = value
                total += search()
                working[row][column] = EMPTY
                if total >= limit:
                    return limit
        return total

    return search()
