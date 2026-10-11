# Evaluated Copilot suggestion: Copilot recommended a server-side session-backed game store with game IDs.
# Rejected: per-player game IDs and session storage. This single-player local app keeps one in-process CURRENT puzzle
# (module-level dict) for /check and /hint; the browser holds the player's board and the Top 10 scores in localStorage.

"""Flask application factory for the Sudoku game."""

from typing import Any

from flask import Flask

if __package__:
    from . import sudoku_logic
    from .routes.api import api
else:
    import sudoku_logic
    from routes.api import api

CURRENT: dict[str, Any] = {"puzzle": None, "solution": None}


def create_app(game_state: dict[str, Any] | None = None) -> Flask:
    """Create and configure the Flask Sudoku application."""
    application = Flask(__name__)
    application.extensions["sudoku_current"] = (
        game_state if game_state is not None else {"puzzle": None, "solution": None}
    )
    application.register_blueprint(api)
    return application


app = create_app(CURRENT)

if __name__ == '__main__':
    app.run(debug=True)