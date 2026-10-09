import copy

import pytest

import app
import sudoku_logic


@pytest.fixture
def client():
    app.CURRENT.update(puzzle=None, solution=None)
    with app.app.test_client() as test_client:
        yield test_client
    app.CURRENT.update(puzzle=None, solution=None)


def make_board():
    return [
        [
            (row * 3 + row // 3 + col) % sudoku_logic.SIZE + 1
            for col in range(sudoku_logic.SIZE)
        ]
        for row in range(sudoku_logic.SIZE)
    ]


def test_index_route_renders_the_game_page(client):
    response = client.get("/")

    assert response.status_code == 200
    assert b"Sudoku Game" in response.data


def test_new_route_uses_default_clue_count_and_stores_game(monkeypatch, client):
    puzzle = [[1 for _ in range(sudoku_logic.SIZE)] for _ in range(sudoku_logic.SIZE)]
    solution = [[2 for _ in range(sudoku_logic.SIZE)] for _ in range(sudoku_logic.SIZE)]
    generated = []

    def fake_generate_puzzle(clues):
        generated.append(clues)
        return puzzle, solution

    monkeypatch.setattr(sudoku_logic, "generate_puzzle", fake_generate_puzzle)

    response = client.get("/new")

    assert response.status_code == 200
    assert response.get_json() == {"puzzle": puzzle}
    assert generated == [35]
    assert app.CURRENT == {"puzzle": puzzle, "solution": solution}


def test_new_route_passes_requested_clue_count(monkeypatch, client):
    puzzle = [[0 for _ in range(sudoku_logic.SIZE)] for _ in range(sudoku_logic.SIZE)]
    solution = copy.deepcopy(puzzle)
    generated = []

    def fake_generate_puzzle(clues):
        generated.append(clues)
        return puzzle, solution

    monkeypatch.setattr(sudoku_logic, "generate_puzzle", fake_generate_puzzle)

    response = client.get("/new?clues=27")

    assert response.status_code == 200
    assert generated == [27]


def test_check_route_reports_error_when_no_game_is_in_progress(client):
    response = client.post("/check", json={"board": make_board()})

    assert response.status_code == 400
    assert response.get_json() == {"error": "No game in progress"}


def test_check_route_returns_all_incorrect_cell_coordinates(client):
    solution = make_board()
    board = copy.deepcopy(solution)
    board[0][1] = (board[0][1] % sudoku_logic.SIZE) + 1
    board[4][7] = (board[4][7] % sudoku_logic.SIZE) + 1
    app.CURRENT["solution"] = solution

    response = client.post("/check", json={"board": board})

    assert response.status_code == 200
    assert response.get_json() == {"incorrect": [[0, 1], [4, 7]]}


def test_check_route_returns_an_empty_list_for_a_correct_board(client):
    solution = make_board()
    app.CURRENT["solution"] = solution

    response = client.post("/check", json={"board": copy.deepcopy(solution)})

    assert response.status_code == 200
    assert response.get_json() == {"incorrect": []}
