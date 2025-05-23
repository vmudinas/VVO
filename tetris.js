document.addEventListener('DOMContentLoaded', () => {
    // Canvas setup
    const canvas = document.getElementById('tetris');
    const context = canvas.getContext('2d');
    const nextPieceCanvas = document.getElementById('next-piece-canvas');
    const nextPieceContext = nextPieceCanvas.getContext('2d');
    
    // Game constants
    const BLOCK_SIZE = 20;
    const BOARD_WIDTH = 12;
    const BOARD_HEIGHT = 20;
    const COLORS = [
        null,
        '#FF0D72', // I
        '#0DC2FF', // J
        '#0DFF72', // L
        '#F538FF', // O
        '#FF8E0D', // S
        '#FFE138', // T
        '#3877FF'  // Z
    ];
    
    // Scale the canvas for better rendering
    context.scale(BLOCK_SIZE, BLOCK_SIZE);
    nextPieceContext.scale(BLOCK_SIZE / 2, BLOCK_SIZE / 2);
    
    // Game variables
    let dropCounter = 0;
    let dropInterval = 1000; // Time in ms between piece drops
    let lastTime = 0;
    let score = 0;
    let lines = 0;
    let level = 1;
    let isGameOver = false;
    let isPaused = true;
    let animationId = null;
    
    // Create the game board
    const board = createBoard(BOARD_WIDTH, BOARD_HEIGHT);
    
    // Define tetromino shapes
    const TETROMINOS = {
        'I': [
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0]
        ],
        'J': [
            [0, 2, 0],
            [0, 2, 0],
            [2, 2, 0]
        ],
        'L': [
            [0, 3, 0],
            [0, 3, 0],
            [0, 3, 3]
        ],
        'O': [
            [4, 4],
            [4, 4]
        ],
        'S': [
            [0, 5, 5],
            [5, 5, 0],
            [0, 0, 0]
        ],
        'T': [
            [0, 0, 0],
            [6, 6, 6],
            [0, 6, 0]
        ],
        'Z': [
            [7, 7, 0],
            [0, 7, 7],
            [0, 0, 0]
        ]
    };
    
    // Player state
    const player = {
        pos: { x: 0, y: 0 },
        piece: null,
        nextPiece: null
    };
    
    // Initialize next piece
    player.nextPiece = randomTetromino();
    resetPlayer();
    
    // DOM elements
    const scoreElement = document.getElementById('score');
    const linesElement = document.getElementById('lines');
    const levelElement = document.getElementById('level');
    const startButton = document.getElementById('start-button');
    const resetButton = document.getElementById('reset-button');
    const scoresListElement = document.getElementById('scores-list');
    
    // Load and display top scores
    displayTopScores();
    
    // Event listeners
    document.addEventListener('keydown', handleKeyPress);
    startButton.addEventListener('click', togglePause);
    resetButton.addEventListener('click', resetGame);
    
    // Game functions
    function createBoard(width, height) {
        const board = [];
        for (let y = 0; y < height; y++) {
            board.push(new Array(width).fill(0));
        }
        return board;
    }
    
    function drawBlock(x, y, color, ctx = context) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
        ctx.strokeStyle = '#800080';
        ctx.strokeRect(x, y, 1, 1);
    }
    
    function drawBoard() {
        board.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    drawBlock(x, y, COLORS[value]);
                }
            });
        });
    }
    
    function drawPiece(tetromino, offset, ctx = context) {
        tetromino.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    drawBlock(
                        x + offset.x,
                        y + offset.y,
                        COLORS[value],
                        ctx
                    );
                }
            });
        });
    }
    
    function drawNextPiece() {
        nextPieceContext.clearRect(0, 0, nextPieceCanvas.width / (BLOCK_SIZE / 2), nextPieceCanvas.height / (BLOCK_SIZE / 2));
        
        const offsetX = (5 - player.nextPiece[0].length) / 2;
        const offsetY = (5 - player.nextPiece.length) / 2;
        
        drawPiece(player.nextPiece, {x: offsetX, y: offsetY}, nextPieceContext);
    }
    
    function draw() {
        context.clearRect(0, 0, canvas.width / BLOCK_SIZE, canvas.height / BLOCK_SIZE);
        drawBoard();
        drawPiece(player.piece, player.pos);
        drawNextPiece();
    }
    
    function update(time = 0) {
        if (isGameOver || isPaused) return;
        
        const deltaTime = time - lastTime;
        lastTime = time;
        
        dropCounter += deltaTime;
        if (dropCounter > dropInterval) {
            moveDown();
        }
        
        draw();
        animationId = requestAnimationFrame(update);
    }
    
    function resetPlayer() {
        player.piece = player.nextPiece;
        player.nextPiece = randomTetromino();
        player.pos.y = 0;
        player.pos.x = Math.floor(BOARD_WIDTH / 2) - Math.floor(player.piece[0].length / 2);
        
        // Check for game over
        if (collision()) {
            gameOver();
        }
    }
    
    function randomTetromino() {
        const tetrominos = 'IJLOSTZ';
        const name = tetrominos[Math.floor(Math.random() * tetrominos.length)];
        return structuredClone(TETROMINOS[name]);
    }
    
    function rotate(piece, direction = 1) {
        // Transpose the matrix
        const rotated = structuredClone(piece);
        for (let y = 0; y < rotated.length; y++) {
            for (let x = 0; x < y; x++) {
                [rotated[x][y], rotated[y][x]] = [rotated[y][x], rotated[x][y]];
            }
        }
        
        // Reverse rows or columns for rotation
        if (direction > 0) {
            rotated.forEach(row => row.reverse());
        } else {
            rotated.reverse();
        }
        
        return rotated;
    }
    
    function collision(piece = player.piece, pos = player.pos) {
        for (let y = 0; y < piece.length; y++) {
            for (let x = 0; x < piece[y].length; x++) {
                if (piece[y][x] !== 0 &&
                   (board[y + pos.y] === undefined ||
                    board[y + pos.y][x + pos.x] === undefined ||
                    board[y + pos.y][x + pos.x] !== 0)) {
                    return true;
                }
            }
        }
        return false;
    }
    
    function merge() {
        player.piece.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    board[y + player.pos.y][x + player.pos.x] = value;
                }
            });
        });
    }
    
    function moveDown() {
        player.pos.y++;
        if (collision()) {
            player.pos.y--;
            merge();
            clearLines();
            resetPlayer();
        }
        dropCounter = 0;
    }
    
    function moveLeft() {
        player.pos.x--;
        if (collision()) {
            player.pos.x++;
        }
    }
    
    function moveRight() {
        player.pos.x++;
        if (collision()) {
            player.pos.x--;
        }
    }
    
    function hardDrop() {
        while (!collision()) {
            player.pos.y++;
        }
        player.pos.y--;
        merge();
        clearLines();
        resetPlayer();
        dropCounter = 0;
    }
    
    function rotatePlayer(direction) {
        const originalPos = player.pos.x;
        let offset = 1;
        const rotated = rotate(player.piece, direction);
        player.piece = rotated;
        
        // Handle wall kicks
        while (collision()) {
            player.pos.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            if (offset > rotated[0].length) {
                player.piece = rotate(player.piece, -direction);
                player.pos.x = originalPos;
                return;
            }
        }
    }
    
    function clearLines() {
        let clearedLines = 0;
        
        outer: for (let y = board.length - 1; y >= 0; y--) {
            for (let x = 0; x < board[y].length; x++) {
                if (board[y][x] === 0) {
                    continue outer;
                }
            }
            
            // Clear the line
            const row = board.splice(y, 1)[0].fill(0);
            board.unshift(row);
            y++;
            clearedLines++;
        }
        
        if (clearedLines > 0) {
            // Update score and level
            updateScore(clearedLines);
        }
    }
    
    function updateScore(clearedLines) {
        // Scoring system: 100 * level for a single line, doubles for each additional line
        const points = [0, 100, 300, 500, 800];
        score += points[clearedLines] * level;
        scoreElement.textContent = score;
        
        lines += clearedLines;
        linesElement.textContent = lines;
        
        // Level increases every 10 lines
        const newLevel = Math.floor(lines / 10) + 1;
        if (newLevel > level) {
            level = newLevel;
            levelElement.textContent = level;
            // Speed up as level increases
            dropInterval = 1000 * Math.pow(0.8, level - 1);
        }
    }
    
    function handleKeyPress(event) {
        if (isGameOver || isPaused) return;
        
        switch(event.keyCode) {
            case 37: // Left arrow
                moveLeft();
                break;
            case 39: // Right arrow
                moveRight();
                break;
            case 40: // Down arrow
                moveDown();
                break;
            case 38: // Up arrow
                rotatePlayer(1);
                break;
            case 32: // Spacebar
                hardDrop();
                break;
        }
    }
    
    function togglePause() {
        isPaused = !isPaused;
        startButton.textContent = isPaused ? 'Resume' : 'Pause';
        
        if (!isPaused) {
            lastTime = 0;
            animationId = requestAnimationFrame(update);
        } else {
            cancelAnimationFrame(animationId);
        }
    }
    
    function resetGame() {
        // Reset the board
        for (let y = 0; y < board.length; y++) {
            board[y].fill(0);
        }
        
        // Reset game variables
        score = 0;
        lines = 0;
        level = 1;
        dropInterval = 1000;
        isGameOver = false;
        
        // Update DOM
        scoreElement.textContent = score;
        linesElement.textContent = lines;
        levelElement.textContent = level;
        
        // Reset player
        player.nextPiece = randomTetromino();
        resetPlayer();
        
        // If paused, unpause
        if (isPaused && !isGameOver) {
            togglePause();
        } else if (isGameOver) {
            isPaused = false;
            startButton.textContent = 'Pause';
            lastTime = 0;
            animationId = requestAnimationFrame(update);
        }
    }
    
    function gameOver() {
        isGameOver = true;
        isPaused = true;
        cancelAnimationFrame(animationId);
        
        // Save the score
        saveScore(score);
        
        // Update top scores display
        displayTopScores();
        
        // Draw game over message
        context.fillStyle = 'rgba(0, 0, 0, 0.75)';
        context.fillRect(0, 7, BOARD_WIDTH, 6);
        
        context.font = '1px Arial';
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText('GAME OVER', BOARD_WIDTH / 2, 10);
    }
    
    // Score management functions
    function saveScore(score) {
        // Skip if score is 0
        if (score === 0) return;
        
        // Get existing scores
        const scores = getTopScores();
        
        // Add new score with timestamp
        const newScore = {
            score: score,
            date: new Date().toLocaleDateString()
        };
        
        scores.push(newScore);
        
        // Sort scores descending and take top 5
        const topScores = scores
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);
        
        // Save to localStorage
        localStorage.setItem('tetrisTopScores', JSON.stringify(topScores));
    }
    
    function getTopScores() {
        const storedScores = localStorage.getItem('tetrisTopScores');
        return storedScores ? JSON.parse(storedScores) : [];
    }
    
    function displayTopScores() {
        const scores = getTopScores();
        
        if (scores.length === 0) {
            scoresListElement.innerHTML = '<p>No scores yet</p>';
            return;
        }
        
        // Create HTML for scores
        const scoreHTML = scores.map((item, index) => {
            return `<div class="score-item">
                <span>#${index + 1}</span>
                <span>${item.score} points</span>
                <span>${item.date}</span>
            </div>`;
        }).join('');
        
        scoresListElement.innerHTML = scoreHTML;
    }
    
    // Initial draw
    draw();
});