class Game {
    constructor() {
        this.board = Array(8).fill().map(() => Array(8).fill(''));
        this.currentPlayer = 'X';
        this.mySymbol = null;
        this.isMyTurn = false;
        this.gameActive = false;
        this.ws = null;
        
        this.initializeWebSocket();
        this.initializeBoard();
        this.setupEventListeners();
    }

    initializeWebSocket() {
        this.ws = new WebSocket('ws://localhost:8080');
        
        this.ws.onopen = () => {
            console.log('Connected to server');
            document.getElementById('status').textContent = 'Connected to server. Waiting for opponent...';
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleServerMessage(data);
        };

        this.ws.onclose = () => {
            document.getElementById('status').textContent = 'Connection lost. Reconnecting...';
            setTimeout(() => this.initializeWebSocket(), 3000);
        };
    }

    initializeBoard() {
        const gameBoard = document.getElementById('game-board');
        gameBoard.innerHTML = '';
        
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = i;
                cell.dataset.col = j;
                gameBoard.appendChild(cell);
            }
        }
    }

    setupEventListeners() {
        document.getElementById('game-board').addEventListener('click', (e) => {
            if (!this.gameActive || !this.isMyTurn) return;
            
            const cell = e.target.closest('.cell');
            if (!cell) return;
            
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            
            if (this.board[row][col] === '') {
                this.makeMove(row, col);
            }
        });

        document.getElementById('new-game').addEventListener('click', () => {
            this.ws.send(JSON.stringify({ type: 'new_game' }));
        });
    }

    makeMove(row, col) {
        this.board[row][col] = this.mySymbol;
        this.updateCell(row, col);
        this.isMyTurn = false;
        
        this.ws.send(JSON.stringify({
            type: 'move',
            row,
            col,
            symbol: this.mySymbol
        }));
    }

    updateCell(row, col) {
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        cell.textContent = this.board[row][col];
        cell.className = `cell ${this.board[row][col].toLowerCase()}`;
    }

    handleServerMessage(data) {
        switch (data.type) {
            case 'game_start':
                this.mySymbol = data.symbol;
                this.gameActive = true;
                this.isMyTurn = data.symbol === 'X';
                document.getElementById('player-symbol').textContent = `You are: ${data.symbol}`;
                document.getElementById('status').textContent = this.isMyTurn ? 'Your turn!' : 'Opponent\'s turn';
                break;

            case 'move':
                this.board[data.row][data.col] = data.symbol;
                this.updateCell(data.row, data.col);
                this.isMyTurn = true;
                document.getElementById('status').textContent = 'Your turn!';
                
                if (this.checkWin(data.row, data.col)) {
                    this.handleGameEnd(data.symbol === this.mySymbol ? 'You won!' : 'You lost!');
                }
                break;

            case 'game_end':
                this.handleGameEnd(data.message);
                break;
        }
    }

    checkWin(row, col) {
        const directions = [
            [[0, 1], [0, -1]], // horizontal
            [[1, 0], [-1, 0]], // vertical
            [[1, 1], [-1, -1]], // diagonal
            [[1, -1], [-1, 1]] // anti-diagonal
        ];

        const symbol = this.board[row][col];

        for (const direction of directions) {
            let count = 1;
            let openEnds = 0;

            for (const [dx, dy] of direction) {
                let x = row + dx;
                let y = col + dy;
                let consecutive = 0;

                while (
                    x >= 0 && x < 8 && y >= 0 && y < 8 &&
                    this.board[x][y] === symbol
                ) {
                    consecutive++;
                    x += dx;
                    y += dy;
                }

                count += consecutive;

                // Check if the end is open
                if (x >= 0 && x < 8 && y >= 0 && y < 8 && this.board[x][y] === '') {
                    openEnds++;
                }
            }

            // Win condition: 5 in a row or 4 with open ends
            if (count >= 5 || (count === 4 && openEnds === 2)) {
                return true;
            }
        }

        return false;
    }

    handleGameEnd(message) {
        this.gameActive = false;
        this.isMyTurn = false;
        document.getElementById('status').textContent = message;
    }
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    new Game();
}); 