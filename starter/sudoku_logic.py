"""Compatibility exports for the original Sudoku logic module."""

if __package__:
    from .sudoku.config import EMPTY, SIZE
    from .sudoku.generator import (
        create_empty_board,
        deep_copy,
        fill_board,
        generate_puzzle,
        is_safe,
        remove_cells,
    )
else:
    from sudoku.config import EMPTY, SIZE
    from sudoku.generator import (
        create_empty_board,
        deep_copy,
        fill_board,
        generate_puzzle,
        is_safe,
        remove_cells,
    )

__all__ = [
    "EMPTY",
    "SIZE",
    "create_empty_board",
    "deep_copy",
    "fill_board",
    "generate_puzzle",
    "is_safe",
    "remove_cells",
]
