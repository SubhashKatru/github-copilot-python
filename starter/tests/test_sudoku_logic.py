import sudoku_logic


def test_deep_copy_creates_an_independent_board():
    board = [[0 for _ in range(sudoku_logic.SIZE)] for _ in range(sudoku_logic.SIZE)]

    copied_board = sudoku_logic.deep_copy(board)
    copied_board[0][0] = 5

    assert board[0][0] == sudoku_logic.EMPTY


def test_create_empty_board_has_expected_dimensions_and_values():
    board = sudoku_logic.create_empty_board()

    assert len(board) == sudoku_logic.SIZE
    assert all(len(row) == sudoku_logic.SIZE for row in board)
    assert all(value == sudoku_logic.EMPTY for row in board for value in row)


def test_is_safe_accepts_a_number_not_present_in_related_units():
    board = sudoku_logic.create_empty_board()
    board[0][0] = 1

    assert sudoku_logic.is_safe(board, 0, 1, 2)


def test_is_safe_rejects_a_number_already_in_the_row():
    board = sudoku_logic.create_empty_board()
    board[0][0] = 4

    assert not sudoku_logic.is_safe(board, 0, 1, 4)


def test_is_safe_rejects_a_number_already_in_the_column():
    board = sudoku_logic.create_empty_board()
    board[0][0] = 4

    assert not sudoku_logic.is_safe(board, 1, 0, 4)


def test_is_safe_rejects_a_number_already_in_the_box():
    board = sudoku_logic.create_empty_board()
    board[0][0] = 4

    assert not sudoku_logic.is_safe(board, 1, 1, 4)


def test_fill_board_produces_a_complete_valid_solution():
    board = sudoku_logic.create_empty_board()

    assert sudoku_logic.fill_board(board)
    expected_values = set(range(1, sudoku_logic.SIZE + 1))
    assert all(set(row) == expected_values for row in board)
    assert all(
        {board[row][col] for row in range(sudoku_logic.SIZE)}
        == expected_values
        for col in range(sudoku_logic.SIZE)
    )
    for box_row in range(0, sudoku_logic.SIZE, 3):
        for box_col in range(0, sudoku_logic.SIZE, 3):
            box_values = {
                board[row][col]
                for row in range(box_row, box_row + 3)
                for col in range(box_col, box_col + 3)
            }
            assert box_values == expected_values


def test_remove_cells_leaves_the_requested_number_of_clues():
    board = [[1 for _ in range(sudoku_logic.SIZE)] for _ in range(sudoku_logic.SIZE)]

    sudoku_logic.remove_cells(board, clues=35)

    assert sum(value != sudoku_logic.EMPTY for row in board for value in row) == 35


def test_generate_puzzle_returns_a_puzzle_and_its_complete_solution():
    puzzle, solution = sudoku_logic.generate_puzzle(clues=35)

    assert len(puzzle) == sudoku_logic.SIZE
    assert all(len(row) == sudoku_logic.SIZE for row in puzzle)
    assert all(len(row) == sudoku_logic.SIZE for row in solution)
    assert sum(value != sudoku_logic.EMPTY for row in puzzle for value in row) == 35
    assert all(
        puzzle[row][col] in (sudoku_logic.EMPTY, solution[row][col])
        for row in range(sudoku_logic.SIZE)
        for col in range(sudoku_logic.SIZE)
    )
    assert all(
        set(row) == set(range(1, sudoku_logic.SIZE + 1))
        for row in solution
    )
