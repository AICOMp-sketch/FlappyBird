
        // Canvas setup
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        
        // Audio Context for sound effects
        let audioCtx = null;
        
        function initAudio() {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
        }
        
        function playSound(type) {
            if (!audioCtx) return;
            
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            switch(type) {
                case 'flap':
                    oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);
                    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
                    oscillator.start(audioCtx.currentTime);
                    oscillator.stop(audioCtx.currentTime + 0.1);
                    break;
                case 'score':
                    oscillator.frequency.setValueAtTime(523, audioCtx.currentTime);
                    oscillator.frequency.setValueAtTime(659, audioCtx.currentTime + 0.1);
                    oscillator.frequency.setValueAtTime(784, audioCtx.currentTime + 0.2);
                    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
                    oscillator.start(audioCtx.currentTime);
                    oscillator.stop(audioCtx.currentTime + 0.3);
                    break;
                case 'hit':
                    oscillator.type = 'sawtooth';
                    oscillator.frequency.setValueAtTime(200, audioCtx.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.3);
                    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
                    oscillator.start(audioCtx.currentTime);
                    oscillator.stop(audioCtx.currentTime + 0.3);
                    break;
            }
        }
        
        // Game state
        let gameState = 'start'; // 'start', 'playing', 'gameover'
        let score = 0;
        let highScore = parseInt(localStorage.getItem('flappyHighScore')) || 0;
        
        // Bird properties
        const bird = {
            x: 80,
            y: 300,
            width: 40,
            height: 30,
            velocity: 0,
            gravity: 0.5,
            jumpStrength: -9,
            rotation: 0
        };
        
        // Pipe properties
        let pipes = [];
        const pipeWidth = 60;
        const pipeGap = 160;
        const pipeSpeed = 3;
        let pipeSpawnTimer = 0;
        const pipeSpawnInterval = 90;
        
        // Particles
        let particles = [];
        
        class Particle {
            constructor(x, y, color, type = 'normal') {
                this.x = x;
                this.y = y;
                this.color = color;
                this.type = type;
                this.size = Math.random() * 6 + 2;
                this.speedX = (Math.random() - 0.5) * (type === 'explosion' ? 10 : 4);
                this.speedY = (Math.random() - 0.5) * (type === 'explosion' ? 10 : 4);
                this.life = 1;
                this.decay = Math.random() * 0.02 + 0.02;
            }
            
            update() {
                this.x += this.speedX;
                this.y += this.speedY;
                this.life -= this.decay;
                if (this.type === 'explosion') {
                    this.speedY += 0.2;
                }
            }
            
            draw() {
                ctx.save();
                ctx.globalAlpha = this.life;
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
        
        function createFlapParticles() {
            for (let i = 0; i < 5; i++) {
                particles.push(new Particle(
                    bird.x,
                    bird.y + bird.height / 2,
                    `hsl(${180 + Math.random() * 40}, 100%, 70%)`
                ));
            }
        }
        
        function createExplosionParticles(x, y) {
            const colors = ['#ff6b6b', '#ffd93d', '#ff8c42', '#fff'];
            for (let i = 0; i < 30; i++) {
                particles.push(new Particle(
                    x, y,
                    colors[Math.floor(Math.random() * colors.length)],
                    'explosion'
                ));
            }
        }
        
        function createScoreParticles() {
            for (let i = 0; i < 10; i++) {
                particles.push(new Particle(
                    canvas.width / 2,
                    50,
                    `hsl(${50 + Math.random() * 20}, 100%, 60%)`
                ));
            }
        }
        
        // Background elements
        const clouds = [];
        for (let i = 0; i < 5; i++) {
            clouds.push({
                x: Math.random() * canvas.width,
                y: Math.random() * 200 + 50,
                size: Math.random() * 40 + 30,
                speed: Math.random() * 0.5 + 0.2
            });
        }
        
        function drawBackground() {
            // Sky gradient
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, '#87CEEB');
            gradient.addColorStop(0.6, '#87CEEB');
            gradient.addColorStop(1, '#90EE90');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Clouds
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            clouds.forEach(cloud => {
                ctx.beginPath();
                ctx.arc(cloud.x, cloud.y, cloud.size, 0, Math.PI * 2);
                ctx.arc(cloud.x + cloud.size * 0.6, cloud.y - cloud.size * 0.2, cloud.size * 0.7, 0, Math.PI * 2);
                ctx.arc(cloud.x + cloud.size * 1.2, cloud.y, cloud.size * 0.8, 0, Math.PI * 2);
                ctx.fill();
                
                cloud.x -= cloud.speed;
                if (cloud.x < -cloud.size * 2) {
                    cloud.x = canvas.width + cloud.size;
                }
            });
            
            // Ground
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
            ctx.fillStyle = '#228B22';
            ctx.fillRect(0, canvas.height - 50, canvas.width, 15);
        }
        
        function drawBird() {
            ctx.save();
            ctx.translate(bird.x + bird.width / 2, bird.y + bird.height / 2);
            
            // Rotation based on velocity
            bird.rotation = Math.min(Math.max(bird.velocity * 3, -30), 90);
            ctx.rotate(bird.rotation * Math.PI / 180);
            
            // Body
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.ellipse(0, 0, bird.width / 2, bird.height / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#DAA520';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Wing
            ctx.fillStyle = '#FFA500';
            ctx.beginPath();
            const wingY = Math.sin(Date.now() / 50) * 3;
            ctx.ellipse(-5, wingY, 12, 8, -0.3, 0, Math.PI * 2);
            ctx.fill();
            
            // Eye
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(10, -5, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'black';
            ctx.beginPath();
            ctx.arc(12, -5, 4, 0, Math.PI * 2);
            ctx.fill();
            
            // Beak
            ctx.fillStyle = '#FF6347';
            ctx.beginPath();
            ctx.moveTo(15, 2);
            ctx.lineTo(28, 5);
            ctx.lineTo(15, 8);
            ctx.closePath();
            ctx.fill();
            
            ctx.restore();
        }
        
        function drawPipe(pipe) {
            const gradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipeWidth, 0);
            gradient.addColorStop(0, '#228B22');
            gradient.addColorStop(0.5, '#32CD32');
            gradient.addColorStop(1, '#228B22');
            
            ctx.fillStyle = gradient;
            
            // Top pipe
            ctx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight);
            // Top pipe cap
            ctx.fillStyle = '#1a6b1a';
            ctx.fillRect(pipe.x - 5, pipe.topHeight - 30, pipeWidth + 10, 30);
            ctx.fillStyle = '#2d8b2d';
            ctx.fillRect(pipe.x - 5, pipe.topHeight - 30, pipeWidth + 10, 5);
            
            // Bottom pipe
            ctx.fillStyle = gradient;
            const bottomY = pipe.topHeight + pipeGap;
            ctx.fillRect(pipe.x, bottomY, pipeWidth, canvas.height - bottomY - 50);
            // Bottom pipe cap
            ctx.fillStyle = '#1a6b1a';
            ctx.fillRect(pipe.x - 5, bottomY, pipeWidth + 10, 30);
            ctx.fillStyle = '#2d8b2d';
            ctx.fillRect(pipe.x - 5, bottomY + 25, pipeWidth + 10, 5);
        }
        
        function drawScore() {
            ctx.fillStyle = 'white';
            ctx.font = '32px "Press Start 2P", cursive';
            ctx.textAlign = 'center';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 4;
            ctx.strokeText(score, canvas.width / 2, 50);
            ctx.fillText(score, canvas.width / 2, 50);
        }
        
        function spawnPipe() {
            const minHeight = 80;
            const maxHeight = canvas.height - pipeGap - 130;
            const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
            
            pipes.push({
                x: canvas.width,
                topHeight: topHeight,
                passed: false
            });
        }
        
        function checkCollision() {
            // Ground and ceiling
            if (bird.y + bird.height > canvas.height - 50 || bird.y < 0) {
                return true;
            }
            
            // Pipes
            for (let pipe of pipes) {
                const birdBox = {
                    x: bird.x + 5,
                    y: bird.y + 5,
                    width: bird.width - 10,
                    height: bird.height - 10
                };
                
                // Top pipe
                if (birdBox.x + birdBox.width > pipe.x &&
                    birdBox.x < pipe.x + pipeWidth &&
                    birdBox.y < pipe.topHeight) {
                    return true;
                }
                
                // Bottom pipe
                const bottomY = pipe.topHeight + pipeGap;
                if (birdBox.x + birdBox.width > pipe.x &&
                    birdBox.x < pipe.x + pipeWidth &&
                    birdBox.y + birdBox.height > bottomY) {
                    return true;
                }
            }
            
            return false;
        }
        
        function update() {
            if (gameState !== 'playing') return;
            
            // Bird physics
            bird.velocity += bird.gravity;
            bird.y += bird.velocity;
            
            // Pipe spawning
            pipeSpawnTimer++;
            if (pipeSpawnTimer >= pipeSpawnInterval) {
                spawnPipe();
                pipeSpawnTimer = 0;
            }
            
            // Update pipes
            for (let i = pipes.length - 1; i >= 0; i--) {
                pipes[i].x -= pipeSpeed;
                
                // Score
                if (!pipes[i].passed && pipes[i].x + pipeWidth < bird.x) {
                    pipes[i].passed = true;
                    score++;
                    playSound('score');
                    createScoreParticles();
                }
                
                // Remove off-screen pipes
                if (pipes[i].x + pipeWidth < 0) {
                    pipes.splice(i, 1);
                }
            }
            
            // Update particles
            for (let i = particles.length - 1; i >= 0; i--) {
                particles[i].update();
                if (particles[i].life <= 0) {
                    particles.splice(i, 1);
                }
            }
            
            // Collision detection
            if (checkCollision()) {
                gameOver();
            }
        }
        
        function draw() {
            drawBackground();
            
            // Draw pipes
            pipes.forEach(drawPipe);
            
            // Draw particles
            particles.forEach(p => p.draw());
            
            // Draw bird
            drawBird();
            
            // Draw score
            if (gameState === 'playing') {
                drawScore();
            }
        }
        
        function gameLoop() {
            update();
            draw();
            requestAnimationFrame(gameLoop);
        }
        
        function flap() {
            if (gameState === 'playing') {
                bird.velocity = bird.jumpStrength;
                playSound('flap');
                createFlapParticles();
            }
        }
        
        function startGame() {
            initAudio();
            gameState = 'playing';
            document.getElementById('startScreen').classList.add('hidden');
            resetGame();
        }
        
        function resetGame() {
            bird.y = 300;
            bird.velocity = 0;
            pipes = [];
            particles = [];
            score = 0;
            pipeSpawnTimer = 0;
        }
        
        function gameOver() {
            gameState = 'gameover';
            playSound('hit');
            createExplosionParticles(bird.x + bird.width / 2, bird.y + bird.height / 2);
            
            // Update high score
            const isNewHighScore = score > highScore;
            if (isNewHighScore) {
                highScore = score;
                localStorage.setItem('flappyHighScore', highScore);
            }
            
            // Show game over screen
            setTimeout(() => {
                document.getElementById('finalScore').textContent = score;
                document.getElementById('highScoreDisplay').textContent = highScore;
                document.getElementById('newHighScore').classList.toggle('hidden', !isNewHighScore);
                document.getElementById('gameOverScreen').classList.remove('hidden');
            }, 500);
        }
        
        function restartGame() {
            document.getElementById('gameOverScreen').classList.add('hidden');
            resetGame();
            gameState = 'playing';
        }
        
        // Event listeners
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                if (gameState === 'start') {
                    startGame();
                } else if (gameState === 'playing') {
                    flap();
                } else if (gameState === 'gameover') {
                    restartGame();
                }
            }
        });
        
        canvas.addEventListener('click', () => {
            if (gameState === 'playing') {
                flap();
            }
        });
        
        // Touch support
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (gameState === 'playing') {
                flap();
            }
        });
        
        // Initialize high score display
        document.getElementById('highScoreDisplay').textContent = highScore;
        
        // Start the game loop
        gameLoop();