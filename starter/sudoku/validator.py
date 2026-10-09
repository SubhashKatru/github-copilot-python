"""Pure validation helpers for Sudoku boards and moves."""

from collections.abc import Sequence
from typing import TypeGuard

from .config import BOX_SIZE, EMPTY, SIZE

Board = Sequence[Sequence[int]]


def is_valid_board_shape(board: object) -> TypeGuard[Sequence[Sequence[object]]]:
    """Return whether a value has the dimensions of a Sudoku board."""
    return (
        isinstance(board, (list, tuple))
        and len(board) == SIZE
        and all(isinstance(row, (list, tuple)) and len(row) == SIZE for row in board)
    )


def is_valid_value(value: object) -> TypeGuard[int]:
    """Return whether a cell value is an integer from 0 through 9."""
    return isinstance(value, int) and not isinstance(value, bool) and EMPTY <= value <= SIZE


def is_valid_row(row: Sequence[int]) -> bool:
    """Return whether a row contains no repeated non-empty values."""
    values = [value for value in row if value != EMPTY]
    return len(values) == len(set(values)) and all(1 <= value <= SIZE for value in values)


def is_valid_column(board: Board, column: int) -> bool:
    """Return whether a column contains no repeated non-empty values."""
    return is_valid_row([board[row][column] for row in range(SIZE)])


def is_valid_box(board: Board, row: int, column: int) -> bool:
    """Return whether the 3x3 box containing a cell has no duplicates."""
    start_row = row - row % BOX_SIZE
    start_column = column - column % BOX_SIZE
    values = [
        board[current_row][current_column]
        for current_row in range(start_row, start_row + BOX_SIZE)
        for current_column in range(start_column, start_column + BOX_SIZE)
    ]
    return is_valid_row(values)


def is_valid_move(board: Board, row: int, column: int, value: int) -> bool:
    """Return whether placing a value at a cell obeys Sudoku constraints."""
    if not (0 <= row < SIZE and 0 <= column < SIZE and 1 <= value <= SIZE):
        return False
    return (
        all(board[row][current_column] != value for current_column in range(SIZE))
        and all(board[current_row][column] != value for current_row in range(SIZE))
        and all(
            board[current_row][current_column] != value
            for current_row in range(row - row % BOX_SIZE, row - row % BOX_SIZE + BOX_SIZE)
            for current_column in range(
                column - column % BOX_SIZE,
                column - column % BOX_SIZE + BOX_SIZE,
            )
        )
    )
