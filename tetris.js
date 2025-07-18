document.addEventListener('DOMContentLoaded', () => {
    // Canvas setup
    const canvas = document.getElementById('tetris');
    const context = canvas.getContext('2d');
    const nextPieceCanvas = document.getElementById('next-piece-canvas');
    const nextPieceContext = nextPieceCanvas.getContext('2d');
    
    // Game constants
    const BLOCK_SIZE = 15; // Reduced from 20
    const BOARD_WIDTH = 24; // Doubled from 12
    const BOARD_HEIGHT = 20;
    const COLORS = [
        null,
        '#FF3366', // I - Vibrant pink
        '#33CCFF', // J - Bright blue
        '#66FF99', // L - Light green
        '#CC33FF', // O - Purple
        '#FF9933', // S - Orange
        '#FFFF33', // T - Yellow
        '#3366FF', // Z - Royal blue
        '#FFFFFF'  // Flash effect
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
        // Base block shape
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
        
        // Add AI-like generated texture effects
        const blockSize = ctx === context ? 1 : 0.5;
        
        // Add gradient effect
        const gradient = ctx.createLinearGradient(x, y, x + blockSize, y + blockSize);
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.7, adjustBrightness(color, 1.2)); // Lighter
        gradient.addColorStop(1, adjustBrightness(color, 0.8)); // Darker
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x + 0.05, y + 0.05, blockSize - 0.1, blockSize - 0.1);
        
        // Add highlight
        ctx.fillStyle = adjustBrightness(color, 1.5);
        ctx.beginPath();
        ctx.moveTo(x + 0.1, y + 0.1);
        ctx.lineTo(x + 0.3, y + 0.1);
        ctx.lineTo(x + 0.1, y + 0.3);
        ctx.closePath();
        ctx.fill();
        
        // Draw border
        ctx.strokeStyle = adjustBrightness(color, 0.6);
        ctx.lineWidth = 0.05;
        ctx.strokeRect(x, y, blockSize, blockSize);
    }
    
    // Helper function to adjust brightness of a color
    function adjustBrightness(hex, factor) {
        if (hex === '#FFFFFF') return hex; // Don't adjust flash effect color
        
        // Convert hex to RGB
        let r = parseInt(hex.substr(1, 2), 16);
        let g = parseInt(hex.substr(3, 2), 16);
        let b = parseInt(hex.substr(5, 2), 16);
        
        // Adjust brightness
        r = Math.min(255, Math.round(r * factor));
        g = Math.min(255, Math.round(g * factor));
        b = Math.min(255, Math.round(b * factor));
        
        // Convert back to hex
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
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
        // Clear the next piece canvas
        nextPieceContext.clearRect(0, 0, nextPieceCanvas.width / (BLOCK_SIZE / 2), nextPieceCanvas.height / (BLOCK_SIZE / 2));
        
        // Draw a background for next piece area
        nextPieceContext.fillStyle = '#f0f0f0';
        nextPieceContext.fillRect(0, 0, nextPieceCanvas.width / (BLOCK_SIZE / 2), nextPieceCanvas.height / (BLOCK_SIZE / 2));
        
        const offsetX = (5 - player.nextPiece[0].length) / 2;
        const offsetY = (5 - player.nextPiece.length) / 2;
        
        drawPiece(player.nextPiece, {x: offsetX, y: offsetY}, nextPieceContext);
    }
    
    function draw() {
        // Clear the canvas
        context.clearRect(0, 0, canvas.width / BLOCK_SIZE, canvas.height / BLOCK_SIZE);
        
        // Draw a subtle grid pattern for the background
        context.fillStyle = '#f8f8f8';
        context.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
        
        // Draw grid lines
        context.strokeStyle = '#e0e0e0';
        context.lineWidth = 0.02;
        
        // Vertical grid lines
        for (let x = 0; x <= BOARD_WIDTH; x++) {
            context.beginPath();
            context.moveTo(x, 0);
            context.lineTo(x, BOARD_HEIGHT);
            context.stroke();
        }
        
        // Horizontal grid lines
        for (let y = 0; y <= BOARD_HEIGHT; y++) {
            context.beginPath();
            context.moveTo(0, y);
            context.lineTo(BOARD_WIDTH, y);
            context.stroke();
        }
        
        // Draw the board
        drawBoard();
        
        // Draw the active piece
        drawPiece(player.piece, player.pos);
        
        // Draw the next piece preview
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
            setTimeout(() => {
                resetPlayer();
            }, 150); // Slight delay after line clearing
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
        setTimeout(() => {
            resetPlayer();
        }, 150); // Slight delay after line clearing
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
        let linesToClear = [];
        
        // Find lines to clear
        outer: for (let y = board.length - 1; y >= 0; y--) {
            for (let x = 0; x < board[y].length; x++) {
                if (board[y][x] === 0) {
                    continue outer;
                }
            }
            linesToClear.push(y);
        }
        
        // If we have lines to clear, add a flash effect
        if (linesToClear.length > 0) {
            // Flash the lines
            const flashLines = () => {
                linesToClear.forEach(y => {
                    for (let x = 0; x < board[y].length; x++) {
                        board[y][x] = 8; // Special color code for flashing
                    }
                });
                draw();
                
                // Clear the lines after the flash effect
                setTimeout(() => {
                    // Clear the lines (from bottom to top to avoid index issues)
                    linesToClear.sort((a, b) => b - a).forEach(y => {
                        const row = board.splice(y, 1)[0].fill(0);
                        board.unshift(row);
                        clearedLines++;
                    });
                    
                    // Update score
                    updateScore(clearedLines);
                    draw();
                }, 100);
            };
            
            flashLines();
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
            case 65: // A key
                moveLeft();
                break;
            case 39: // Right arrow
            case 68: // D key
                moveRight();
                break;
            case 40: // Down arrow
            case 83: // S key
                moveDown();
                break;
            case 38: // Up arrow
            case 87: // W key
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
        
        context.font = '2px Arial';
        context.fillStyle = 'red';
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