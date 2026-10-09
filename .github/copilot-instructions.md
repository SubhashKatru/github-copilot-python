# GitHub Copilot Instructions - Modern Sudoku Project

## Tech Stack & Architecture
- Language: Python 3.10+
- Web Framework: Flask using the application factory pattern (`create_app`) and Blueprints.
- Testing: Pytest for modular unit and integration testing.
- Frontend: Vanilla JavaScript (ES6+), plain CSS using CSS custom properties (variables), semantic HTML5. No heavyweight UI libraries or external CSS frameworks.

## Project Structure & Modularity
All game logic must reside in dedicated, single-responsibility modules:
- `sudoku/generator.py`: Generates randomized puzzles with guaranteed unique solutions.
- `sudoku/solver.py`: Backtracking solver with a solution counter capped at 2.
- `sudoku/validator.py`: Pure functions to validate rows, columns, 3x3 boxes, and moves.
- `sudoku/config.py`: Difficulty thresholds and configuration settings.
- `routes/api.py`: Clean JSON API endpoints (`/new`, `/check`, `/hint`).
- `templates/` and `static/`: Distinct presentation and asset layers.

## Code Quality & Coding Standards
- Strictly adhere to PEP 8 styling.
- Provide descriptive type hints for all function arguments and returns.
- Include Google-style docstrings for every class, function, and method.
- No global mutable state: keep backend endpoints stateless.
- Consistent error handling: wrap operations in try/except blocks, returning structured JSON error payloads with standard HTTP status codes (e.g., 400, 404, 500).

## UI, Styling & Accessibility (WCAG 2.1 AA)
- Responsive layout using CSS Grid/Flexbox and `clamp()` to scale cleanly from mobile to desktop without horizontal scroll.
- Distinct 3x3 box alternating background colors with zero layout shift (fixed cell dimensions and `box-sizing: border-box`).
- Dual-theme support (Light and Dark) via CSS variables, maintaining a minimum text contrast ratio of 4.5:1.
- Accessible visual indicators: do not rely solely on color for conflicts (pair colors with borders or icons).

## Interactive Rules
- Prefilled cells must be locked (`readonly` / disabled).
- Immediate conflict detection: highlight duplicate numbers in identical rows, columns, or 3x3 boxes on entry.
- Hint button: fills exactly one valid cell from the solution, locks it, and increments the hint counter.
- Check button: highlights incorrect user entries without modifying or revealing correct answers.
- Scoreboard: persist Top 10 fastest times in browser `localStorage` with player name, elapsed time, difficulty, and hints used.