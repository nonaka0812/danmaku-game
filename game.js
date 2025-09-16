// ゲームの基本設定
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ステージ設定
const stageConfigs = {
    1: { enemiesToKill: 5, enemySpawnRate: 0.02, enemySpeed: 1.5, enemyHealth: 1, enemyShootRate: 0.8, hasBoss: false },
    2: { enemiesToKill: 8, enemySpawnRate: 0.03, enemySpeed: 2.0, enemyHealth: 1, enemyShootRate: 0.9, hasBoss: false },
    3: { enemiesToKill: 12, enemySpawnRate: 0.04, enemySpeed: 2.5, enemyHealth: 2, enemyShootRate: 1.0, hasBoss: true },
    4: { enemiesToKill: 15, enemySpawnRate: 0.05, enemySpeed: 3.0, enemyHealth: 2, enemyShootRate: 1.1, hasBoss: true },
    5: { enemiesToKill: 20, enemySpawnRate: 0.06, enemySpeed: 3.5, enemyHealth: 3, enemyShootRate: 1.2, hasBoss: true }
};

// パワーアップの種類と効果
const powerUpTypes = {
    rapidFire: { name: '連射アップ', color: '#00ff00', duration: 300, effect: 'shootCooldown' },
    maxBounces: { name: '反射増加', color: '#0088ff', duration: 600, effect: 'maxBounces' },
    piercing: { name: '貫通弾', color: '#ff8800', duration: 450, effect: 'piercing' },
    explosive: { name: '爆発弾', color: '#ff0088', duration: 400, effect: 'explosive' },
    speedUp: { name: 'スピードアップ', color: '#ffff00', duration: 500, effect: 'speed' },
    multiShot: { name: 'マルチショット', color: '#ff00ff', duration: 350, effect: 'multiShot' }
};

// 特殊アイテム
const specialItems = {
    shield: { name: 'シールド', color: '#00ffff', duration: 180 },
    slowMotion: { name: 'スローモーション', color: '#8888ff', duration: 240 },
    clearBomb: { name: 'クリアボム', color: '#ff4444', duration: 1 }
};

// ゲーム状態
let gameState = {
    running: true,
    score: 0,
    lives: 3,
    stage: 1,
    enemiesKilled: 0,
    enemies: [],
    bullets: [],
    enemyBullets: [],
    particles: [],
    keys: {},
    stageComplete: false,
    powerUps: [],
    items: [],
    obstacles: [],
    boss: null,
    combo: 0,
    maxCombo: 0,
    achievements: [],
    timeLimit: 0,
    slowMotion: false,
    shield: 0
};

// プレイヤーオブジェクト
const player = {
    x: canvas.width / 2,
    y: canvas.height - 50,
    width: 20,
    height: 20,
    speed: 5,
    shootCooldown: 0,
    invulnerable: 0,
    powerUps: {
        rapidFire: 0,
        maxBounces: 1,
        piercing: false,
        explosive: false,
        multiShot: 0
    },
    baseSpeed: 5,
    baseShootCooldown: 10
};

// キーボード入力の処理
document.addEventListener('keydown', (e) => {
    gameState.keys[e.code] = true;
    if (e.code === 'KeyR' && !gameState.running) {
        restartGame();
    }
});

document.addEventListener('keyup', (e) => {
    gameState.keys[e.code] = false;
});

// プレイヤーの更新
function updatePlayer() {
    if (!gameState.running) return;
    
    // パワーアップ効果の適用
    applyPowerUpEffects();
    
    // 移動処理（スローモーション効果を考慮）
    const moveSpeed = gameState.slowMotion ? player.speed * 0.5 : player.speed;
    
    if (gameState.keys['KeyA'] && player.x > 0) {
        player.x -= moveSpeed;
    }
    if (gameState.keys['KeyD'] && player.x < canvas.width - player.width) {
        player.x += moveSpeed;
    }
    if (gameState.keys['KeyW'] && player.y > 0) {
        player.y -= moveSpeed;
    }
    if (gameState.keys['KeyS'] && player.y < canvas.height - player.height) {
        player.y += moveSpeed;
    }
    
    // ショット処理
    if (gameState.keys['Space'] && player.shootCooldown <= 0) {
        shootBullet();
        player.shootCooldown = player.baseShootCooldown;
    }
    
    if (player.shootCooldown > 0) {
        player.shootCooldown--;
    }
    
    if (player.invulnerable > 0) {
        player.invulnerable--;
    }
    
    // シールド効果
    if (gameState.shield > 0) {
        gameState.shield--;
    }
}

// パワーアップ効果の適用
function applyPowerUpEffects() {
    // 連射アップ効果
    if (player.powerUps.rapidFire > 0) {
        player.shootCooldown = Math.max(1, player.baseShootCooldown - 5);
        player.powerUps.rapidFire--;
    }
    
    // スピードアップ効果
    if (player.powerUps.speedUp > 0) {
        player.speed = player.baseSpeed * 1.5;
        player.powerUps.speedUp--;
    } else {
        player.speed = player.baseSpeed;
    }
    
    // その他のパワーアップ効果の時間管理
    if (player.powerUps.piercing && player.powerUps.piercing > 0) {
        player.powerUps.piercing--;
    }
    if (player.powerUps.explosive && player.powerUps.explosive > 0) {
        player.powerUps.explosive--;
    }
    if (player.powerUps.multiShot > 0) {
        player.powerUps.multiShot--;
    }
}

// 弾丸の発射
function shootBullet() {
    const centerX = player.x + player.width / 2;
    const centerY = player.y;
    
    // 基本弾丸
    gameState.bullets.push({
        x: centerX - 2,
        y: centerY,
        width: 4,
        height: 10,
        speed: 8,
        color: '#00ff00',
        vx: 0,
        vy: -8,
        bounces: 0,
        maxBounces: player.powerUps.maxBounces || 1,
        piercing: player.powerUps.piercing > 0,
        explosive: player.powerUps.explosive > 0,
        type: 'player'
    });
    
    // マルチショット効果
    if (player.powerUps.multiShot > 0) {
        const angles = [-0.3, 0.3]; // 左右に30度
        angles.forEach(angle => {
            const vx = Math.sin(angle) * 8;
            const vy = Math.cos(angle) * 8;
            gameState.bullets.push({
                x: centerX - 2,
                y: centerY,
                width: 4,
                height: 10,
                speed: 8,
                color: '#00ff00',
                vx: vx,
                vy: vy,
                bounces: 0,
                maxBounces: player.powerUps.maxBounces || 1,
                piercing: player.powerUps.piercing > 0,
                explosive: player.powerUps.explosive > 0,
                type: 'player'
            });
        });
    }
}

// 弾丸の更新
function updateBullets() {
    // プレイヤーの弾丸
    for (let i = gameState.bullets.length - 1; i >= 0; i--) {
        const bullet = gameState.bullets[i];
        
        // 位置更新
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
        
        // 壁との反射判定
        if (bullet.x <= 0 || bullet.x >= canvas.width - bullet.width) {
            if (bullet.bounces < bullet.maxBounces) {
                bullet.vx = -bullet.vx;
                bullet.bounces++;
                // 壁からはみ出さないように調整
                if (bullet.x <= 0) bullet.x = 0;
                if (bullet.x >= canvas.width - bullet.width) bullet.x = canvas.width - bullet.width;
            } else {
                gameState.bullets.splice(i, 1);
                continue;
            }
        }
        
        if (bullet.y <= 0 || bullet.y >= canvas.height - bullet.height) {
            if (bullet.bounces < bullet.maxBounces) {
                bullet.vy = -bullet.vy;
                bullet.bounces++;
                // 壁からはみ出さないように調整
                if (bullet.y <= 0) bullet.y = 0;
                if (bullet.y >= canvas.height - bullet.height) bullet.y = canvas.height - bullet.height;
            } else {
                gameState.bullets.splice(i, 1);
                continue;
            }
        }
    }
    
    // 敵の弾丸
    for (let i = gameState.enemyBullets.length - 1; i >= 0; i--) {
        const bullet = gameState.enemyBullets[i];
        
        // 位置更新
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
        
        // 追尾弾の場合はプレイヤーに向かって軌道を調整
        if (bullet.type === 'homing') {
            const dx = player.x + player.width / 2 - bullet.x;
            const dy = player.y + player.height / 2 - bullet.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                const homingStrength = 0.05; // 追尾の強さ
                bullet.vx += (dx / distance) * homingStrength;
                bullet.vy += (dy / distance) * homingStrength;
                
                // 速度を制限
                const maxSpeed = bullet.speed * 1.5;
                const currentSpeed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);
                if (currentSpeed > maxSpeed) {
                    bullet.vx = (bullet.vx / currentSpeed) * maxSpeed;
                    bullet.vy = (bullet.vy / currentSpeed) * maxSpeed;
                }
            }
        }
        
        // 画面外に出たら削除
        if (bullet.x < -10 || bullet.x > canvas.width + 10 || 
            bullet.y < -10 || bullet.y > canvas.height + 10) {
            gameState.enemyBullets.splice(i, 1);
        }
    }
}

// 敵の生成
function spawnEnemy() {
    if (gameState.stageComplete) return;
    
    const config = stageConfigs[gameState.stage];
    if (Math.random() < config.enemySpawnRate) {
        // ステージに応じた敵タイプの選択
        const selectedType = selectEnemyType(gameState.stage);
        
        gameState.enemies.push({
            x: Math.random() * (canvas.width - 30),
            y: -30,
            width: 30,
            height: 30,
            speed: config.enemySpeed + Math.random() * 0.5,
            shootCooldown: 0,
            health: config.enemyHealth,
            maxHealth: config.enemyHealth,
            color: getEnemyColor(gameState.stage),
            type: selectedType,
            angle: 0, // 螺旋弾用
            shootPattern: 0 // パターン切り替え用
        });
    }
}

// ステージに応じた敵タイプの選択
function selectEnemyType(stage) {
    const rand = Math.random();
    
    switch (stage) {
        case 1:
            // ステージ1: 基本敵のみ
            return 'basic';
        case 2:
            // ステージ2: 基本敵70%、円形弾幕敵30%
            return rand < 0.7 ? 'basic' : 'circular';
        case 3:
            // ステージ3: 基本敵40%、円形弾幕敵40%、螺旋弾敵20%
            if (rand < 0.4) return 'basic';
            if (rand < 0.8) return 'circular';
            return 'spiral';
        case 4:
            // ステージ4: 基本敵20%、円形弾幕敵30%、螺旋弾敵30%、追尾弾敵20%
            if (rand < 0.2) return 'basic';
            if (rand < 0.5) return 'circular';
            if (rand < 0.8) return 'spiral';
            return 'homing';
        case 5:
            // ステージ5: 基本敵10%、円形弾幕敵25%、螺旋弾敵35%、追尾弾敵30%
            if (rand < 0.1) return 'basic';
            if (rand < 0.35) return 'circular';
            if (rand < 0.7) return 'spiral';
            return 'homing';
        default:
            return 'basic';
    }
}

// ステージに応じた敵の色
function getEnemyColor(stage) {
    const colors = ['#ff0000', '#ff6600', '#ffaa00', '#ffdd00', '#ff00ff'];
    return colors[Math.min(stage - 1, colors.length - 1)];
}

// 敵の更新
function updateEnemies() {
    const config = stageConfigs[gameState.stage];
    
    for (let i = gameState.enemies.length - 1; i >= 0; i--) {
        const enemy = gameState.enemies[i];
        enemy.y += enemy.speed;
        
        // 敵の弾幕パターン
        if (enemy.shootCooldown <= 0 && enemy.y > 0) {
            createEnemyBulletPattern(enemy);
            enemy.shootCooldown = Math.floor((60 + Math.random() * 60) / config.enemyShootRate);
        }
        
        if (enemy.shootCooldown > 0) {
            enemy.shootCooldown--;
        }
        
        // 螺旋弾用の角度更新
        if (enemy.type === 'spiral') {
            enemy.angle += 0.1;
        }
        
        // 画面外に出たら削除
        if (enemy.y > canvas.height) {
            gameState.enemies.splice(i, 1);
        }
    }
}

// 敵の弾幕パターン
function createEnemyBulletPattern(enemy) {
    const centerX = enemy.x + enemy.width / 2;
    const centerY = enemy.y + enemy.height;
    const config = stageConfigs[gameState.stage];
    
    switch (enemy.type) {
        case 'basic':
            createBasicPattern(centerX, centerY, config);
            break;
        case 'circular':
            createCircularPattern(centerX, centerY, config);
            break;
        case 'spiral':
            createSpiralPattern(centerX, centerY, enemy, config);
            break;
        case 'homing':
            createHomingPattern(centerX, centerY, config);
            break;
    }
}

// 基本パターン（直線弾）
function createBasicPattern(centerX, centerY, config) {
    const speed = 2 + config.enemyShootRate;
    gameState.enemyBullets.push({
        x: centerX,
        y: centerY,
        width: 3,
        height: 8,
        speed: speed,
        vx: 0,
        vy: speed,
        color: '#ff6666',
        type: 'basic'
    });
}

// 円形弾幕パターン
function createCircularPattern(centerX, centerY, config) {
    const bulletCount = 8 + Math.floor(config.enemyShootRate * 2);
    const speed = 1.5 + config.enemyShootRate * 0.5;
    
    // 二重円形弾幕（高ステージ）
    if (config.enemyShootRate > 1.0) {
        for (let i = 0; i < bulletCount; i++) {
            const angle = (i / bulletCount) * Math.PI * 2;
            // 内側の円
            gameState.enemyBullets.push({
                x: centerX,
                y: centerY,
                width: 3,
                height: 3,
                speed: speed * 0.8,
                vx: Math.cos(angle) * speed * 0.8,
                vy: Math.sin(angle) * speed * 0.8,
                color: '#ff4444',
                type: 'circular'
            });
            // 外側の円
            gameState.enemyBullets.push({
                x: centerX,
                y: centerY,
                width: 4,
                height: 4,
                speed: speed * 1.2,
                vx: Math.cos(angle) * speed * 1.2,
                vy: Math.sin(angle) * speed * 1.2,
                color: '#ff6666',
                type: 'circular'
            });
        }
    } else {
        // 通常の円形弾幕
        for (let i = 0; i < bulletCount; i++) {
            const angle = (i / bulletCount) * Math.PI * 2;
            gameState.enemyBullets.push({
                x: centerX,
                y: centerY,
                width: 4,
                height: 4,
                speed: speed,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: '#ff4444',
                type: 'circular'
            });
        }
    }
}

// 螺旋弾幕パターン
function createSpiralPattern(centerX, centerY, enemy, config) {
    const speed = 1.2 + config.enemyShootRate * 0.3;
    const spiralCount = 3 + Math.floor(config.enemyShootRate);
    
    // 逆回転の螺旋も追加（高ステージ）
    const reverseSpiral = config.enemyShootRate > 1.2;
    
    for (let i = 0; i < spiralCount; i++) {
        const angle = enemy.angle + (i / spiralCount) * Math.PI * 2;
        gameState.enemyBullets.push({
            x: centerX,
            y: centerY,
            width: 3,
            height: 3,
            speed: speed,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: '#ffaa00',
            type: 'spiral'
        });
        
        // 逆回転の螺旋
        if (reverseSpiral) {
            const reverseAngle = -enemy.angle + (i / spiralCount) * Math.PI * 2;
            gameState.enemyBullets.push({
                x: centerX,
                y: centerY,
                width: 2,
                height: 2,
                speed: speed * 0.8,
                vx: Math.cos(reverseAngle) * speed * 0.8,
                vy: Math.sin(reverseAngle) * speed * 0.8,
                color: '#ffcc00',
                type: 'spiral'
            });
        }
    }
}

// 追尾弾パターン
function createHomingPattern(centerX, centerY, config) {
    const speed = 1.8 + config.enemyShootRate * 0.4;
    
    // プレイヤーへの方向を計算
    const dx = player.x + player.width / 2 - centerX;
    const dy = player.y + player.height / 2 - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
        const vx = (dx / distance) * speed;
        const vy = (dy / distance) * speed;
        
        // メインの追尾弾
        gameState.enemyBullets.push({
            x: centerX,
            y: centerY,
            width: 4,
            height: 4,
            speed: speed,
            vx: vx,
            vy: vy,
            color: '#ff00ff',
            type: 'homing'
        });
        
        // 高ステージでは複数の追尾弾を扇状に発射
        if (config.enemyShootRate > 1.1) {
            const spreadCount = 3;
            const spreadAngle = Math.PI / 6; // 30度の扇形
            
            for (let i = 0; i < spreadCount; i++) {
                const angle = Math.atan2(dy, dx) + (i - spreadCount / 2) * spreadAngle / spreadCount;
                const spreadVx = Math.cos(angle) * speed * 0.8;
                const spreadVy = Math.sin(angle) * speed * 0.8;
                
                gameState.enemyBullets.push({
                    x: centerX,
                    y: centerY,
                    width: 3,
                    height: 3,
                    speed: speed * 0.8,
                    vx: spreadVx,
                    vy: spreadVy,
                    color: '#ff88ff',
                    type: 'homing'
                });
            }
        }
    }
}

// 当たり判定
function checkCollisions() {
    // プレイヤーの弾丸と敵
    for (let i = gameState.bullets.length - 1; i >= 0; i--) {
        const bullet = gameState.bullets[i];
        if (bullet.type !== 'player') continue;
        
        for (let j = gameState.enemies.length - 1; j >= 0; j--) {
            const enemy = gameState.enemies[j];
            if (isColliding(bullet, enemy)) {
                enemy.health--;
                
                // 爆発弾効果
                if (bullet.explosive) {
                    createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
                    // 周囲の敵にもダメージ
                    for (let k = gameState.enemies.length - 1; k >= 0; k--) {
                        const nearbyEnemy = gameState.enemies[k];
                        if (k !== j && nearbyEnemy) {
                            const dx = nearbyEnemy.x - enemy.x;
                            const dy = nearbyEnemy.y - enemy.y;
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            if (distance < 60) { // 爆発範囲
                                nearbyEnemy.health--;
                                createDamageEffect(nearbyEnemy.x + nearbyEnemy.width / 2, nearbyEnemy.y + nearbyEnemy.height / 2);
                                
                                if (nearbyEnemy.health <= 0) {
                                    gameState.enemies.splice(k, 1);
                                    gameState.enemiesKilled++;
                                    gameState.score += 100 * gameState.stage;
                                    createExplosion(nearbyEnemy.x + nearbyEnemy.width / 2, nearbyEnemy.y + nearbyEnemy.height / 2);
                                }
                            }
                        }
                    }
                }
                
                if (enemy.health <= 0) {
                    gameState.enemies.splice(j, 1);
                    gameState.enemiesKilled++;
                    gameState.combo++;
                    gameState.maxCombo = Math.max(gameState.maxCombo, gameState.combo);
                    
                    // コンボボーナス
                    const comboBonus = Math.floor(gameState.combo / 5) * 50;
                    gameState.score += (100 * gameState.stage) + comboBonus;
                    
                    createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
                    
                    // パワーアップドロップ
                    if (Math.random() < 0.15) {
                        dropPowerUp(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
                    }
                    
                    // ステージクリア判定
                    checkStageComplete();
                } else {
                    // ダメージエフェクト
                    createDamageEffect(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
                }
                
                // 貫通弾でない場合は弾丸を削除
                if (!bullet.piercing) {
                    gameState.bullets.splice(i, 1);
                }
                break;
            }
        }
    }
    
    // 敵の弾丸とプレイヤー
    if (player.invulnerable <= 0 && gameState.shield <= 0) {
        for (let i = gameState.enemyBullets.length - 1; i >= 0; i--) {
            const bullet = gameState.enemyBullets[i];
            if (isColliding(bullet, player)) {
                gameState.enemyBullets.splice(i, 1);
                
                // シールド効果がある場合はシールドを消費
                if (gameState.shield > 0) {
                    gameState.shield = 0;
                    createShieldEffect(player.x + player.width / 2, player.y + player.height / 2);
                } else {
                    gameState.lives--;
                    gameState.combo = 0; // コンボリセット
                    player.invulnerable = 120; // 2秒間無敵
                    createExplosion(player.x + player.width / 2, player.y + player.height / 2);
                    
                    if (gameState.lives <= 0) {
                        gameOver();
                    }
                }
                break;
            }
        }
    }
    
    // パワーアップアイテムとの当たり判定
    for (let i = gameState.powerUps.length - 1; i >= 0; i--) {
        const powerUp = gameState.powerUps[i];
        if (isColliding(powerUp, player)) {
            gameState.powerUps.splice(i, 1);
            applyPowerUp(powerUp.type);
            createPowerUpEffect(powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height / 2);
        }
    }
    
    // 特殊アイテムとの当たり判定
    for (let i = gameState.items.length - 1; i >= 0; i--) {
        const item = gameState.items[i];
        if (isColliding(item, player)) {
            gameState.items.splice(i, 1);
            applySpecialItem(item.type);
            createItemEffect(item.x + item.width / 2, item.y + item.height / 2);
        }
    }
    
    // 障害物との当たり判定
    for (let i = gameState.obstacles.length - 1; i >= 0; i--) {
        const obstacle = gameState.obstacles[i];
        
        // プレイヤーと障害物の当たり判定
        if (isColliding(player, obstacle)) {
            // プレイヤーを障害物から押し出す
            const dx = player.x + player.width / 2 - (obstacle.x + obstacle.width / 2);
            const dy = player.y + player.height / 2 - (obstacle.y + obstacle.height / 2);
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                const pushDistance = 5;
                player.x += (dx / distance) * pushDistance;
                player.y += (dy / distance) * pushDistance;
                
                // 画面外に出ないように制限
                player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
                player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
            }
        }
        
        // プレイヤーの弾丸と障害物の当たり判定
        for (let j = gameState.bullets.length - 1; j >= 0; j--) {
            const bullet = gameState.bullets[j];
            if (bullet.type === 'player' && isColliding(bullet, obstacle)) {
                // 弾丸を障害物で反射
                const dx = bullet.x + bullet.width / 2 - (obstacle.x + obstacle.width / 2);
                const dy = bullet.y + bullet.height / 2 - (obstacle.y + obstacle.height / 2);
                
                if (Math.abs(dx) > Math.abs(dy)) {
                    bullet.vx = -bullet.vx;
                } else {
                    bullet.vy = -bullet.vy;
                }
                
                // 弾丸を障害物から押し出す
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance > 0) {
                    const pushDistance = 3;
                    bullet.x += (dx / distance) * pushDistance;
                    bullet.y += (dy / distance) * pushDistance;
                }
            }
        }
        
        // 敵の弾丸と障害物の当たり判定
        for (let j = gameState.enemyBullets.length - 1; j >= 0; j--) {
            const bullet = gameState.enemyBullets[j];
            if (isColliding(bullet, obstacle)) {
                // 敵の弾丸も障害物で反射
                const dx = bullet.x + bullet.width / 2 - (obstacle.x + obstacle.width / 2);
                const dy = bullet.y + bullet.height / 2 - (obstacle.y + obstacle.height / 2);
                
                if (Math.abs(dx) > Math.abs(dy)) {
                    bullet.vx = -bullet.vx;
                } else {
                    bullet.vy = -bullet.vy;
                }
                
                // 弾丸を障害物から押し出す
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance > 0) {
                    const pushDistance = 3;
                    bullet.x += (dx / distance) * pushDistance;
                    bullet.y += (dy / distance) * pushDistance;
                }
            }
        }
    }
    
    // プレイヤーの弾丸とボス
    if (gameState.boss && gameState.boss.invulnerable <= 0) {
        for (let i = gameState.bullets.length - 1; i >= 0; i--) {
            const bullet = gameState.bullets[i];
            if (bullet.type !== 'player') continue;
            
            if (isColliding(bullet, gameState.boss)) {
                gameState.boss.health--;
                gameState.boss.invulnerable = 10; // 短い無敵時間
                
                // 爆発弾効果
                if (bullet.explosive) {
                    createExplosion(gameState.boss.x + gameState.boss.width / 2, gameState.boss.y + gameState.boss.height / 2);
                }
                
                if (gameState.boss.health <= 0) {
                    // ボス撃破
                    gameState.boss = null;
                    gameState.combo++;
                    gameState.maxCombo = Math.max(gameState.maxCombo, gameState.combo);
                    gameState.score += 1000 * gameState.stage;
                    createExplosion(gameState.boss.x + gameState.boss.width / 2, gameState.boss.y + gameState.boss.height / 2);
                    
                    // 特別なアイテムドロップ
                    dropSpecialItem(gameState.boss.x + gameState.boss.width / 2, gameState.boss.y + gameState.boss.height / 2);
                    
                    gameState.stageComplete = true;
                    setTimeout(() => {
                        nextStage();
                    }, 3000);
                } else {
                    createDamageEffect(gameState.boss.x + gameState.boss.width / 2, gameState.boss.y + gameState.boss.height / 2);
                }
                
                if (!bullet.piercing) {
                    gameState.bullets.splice(i, 1);
                }
                break;
            }
        }
    }
}

// 当たり判定の判定関数
function isColliding(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// ステージクリア判定
function checkStageComplete() {
    const config = stageConfigs[gameState.stage];
    if (gameState.enemiesKilled >= config.enemiesToKill) {
        if (config.hasBoss && !gameState.boss) {
            // ボス戦開始
            spawnBoss();
        } else if (!config.hasBoss) {
            gameState.stageComplete = true;
            setTimeout(() => {
                nextStage();
            }, 2000); // 2秒後に次のステージへ
        }
    }
}

// ボス生成
function spawnBoss() {
    const config = stageConfigs[gameState.stage];
    gameState.boss = {
        x: canvas.width / 2 - 40,
        y: 50,
        width: 80,
        height: 80,
        health: 10 + gameState.stage * 5,
        maxHealth: 10 + gameState.stage * 5,
        speed: 1,
        shootCooldown: 0,
        phase: 1,
        movePattern: 0,
        angle: 0,
        invulnerable: 0,
        color: '#ff0000'
    };
}

// ボス更新
function updateBoss() {
    if (!gameState.boss) return;
    
    const boss = gameState.boss;
    
    // ボスの移動パターン
    boss.movePattern += 0.02;
    boss.x = canvas.width / 2 - 40 + Math.sin(boss.movePattern) * 100;
    
    // ボスの射撃
    if (boss.shootCooldown <= 0) {
        createBossBulletPattern(boss);
        boss.shootCooldown = 30 + Math.random() * 30;
    }
    
    if (boss.shootCooldown > 0) {
        boss.shootCooldown--;
    }
    
    // 無敵時間の管理
    if (boss.invulnerable > 0) {
        boss.invulnerable--;
    }
    
    // フェーズ変更
    const healthRatio = boss.health / boss.maxHealth;
    if (healthRatio < 0.5 && boss.phase === 1) {
        boss.phase = 2;
        boss.speed *= 1.5;
    } else if (healthRatio < 0.2 && boss.phase === 2) {
        boss.phase = 3;
        boss.speed *= 1.5;
    }
}

// ボス弾幕パターン
function createBossBulletPattern(boss) {
    const centerX = boss.x + boss.width / 2;
    const centerY = boss.y + boss.height;
    
    switch (boss.phase) {
        case 1:
            // フェーズ1: 基本的な弾幕
            createBossBasicPattern(centerX, centerY);
            break;
        case 2:
            // フェーズ2: 円形弾幕
            createBossCircularPattern(centerX, centerY);
            break;
        case 3:
            // フェーズ3: 螺旋弾幕
            createBossSpiralPattern(centerX, centerY, boss);
            break;
    }
}

// ボス基本パターン
function createBossBasicPattern(centerX, centerY) {
    for (let i = 0; i < 3; i++) {
        const angle = (i - 1) * 0.3; // 左右に30度
        gameState.enemyBullets.push({
            x: centerX,
            y: centerY,
            width: 6,
            height: 6,
            speed: 3,
            vx: Math.sin(angle) * 3,
            vy: Math.cos(angle) * 3,
            color: '#ff0000',
            type: 'boss'
        });
    }
}

// ボス円形パターン
function createBossCircularPattern(centerX, centerY) {
    const bulletCount = 12;
    for (let i = 0; i < bulletCount; i++) {
        const angle = (i / bulletCount) * Math.PI * 2;
        gameState.enemyBullets.push({
            x: centerX,
            y: centerY,
            width: 5,
            height: 5,
            speed: 2.5,
            vx: Math.cos(angle) * 2.5,
            vy: Math.sin(angle) * 2.5,
            color: '#ff6600',
            type: 'boss'
        });
    }
}

// ボス螺旋パターン
function createBossSpiralPattern(centerX, centerY, boss) {
    boss.angle += 0.2;
    const spiralCount = 4;
    
    for (let i = 0; i < spiralCount; i++) {
        const angle = boss.angle + (i / spiralCount) * Math.PI * 2;
        gameState.enemyBullets.push({
            x: centerX,
            y: centerY,
            width: 4,
            height: 4,
            speed: 2,
            vx: Math.cos(angle) * 2,
            vy: Math.sin(angle) * 2,
            color: '#ffaa00',
            type: 'boss'
        });
    }
}

// 次のステージへ
function nextStage() {
    if (gameState.stage < 5) {
        gameState.stage++;
        gameState.enemiesKilled = 0;
        gameState.stageComplete = false;
        gameState.enemies = [];
        gameState.bullets = [];
        gameState.enemyBullets = [];
        gameState.particles = [];
        
        // プレイヤーを中央に戻す
        player.x = canvas.width / 2;
        player.y = canvas.height - 50;
        player.invulnerable = 120; // 2秒間無敵
        
        updateUI();
    } else {
        // 全ステージクリア
        gameState.running = false;
        showStageComplete();
    }
}

// ダメージエフェクト
function createDamageEffect(x, y) {
    for (let i = 0; i < 5; i++) {
        gameState.particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 15,
            maxLife: 15,
            color: '#ffaa00'
        });
    }
}

// パワーアップドロップ
function dropPowerUp(x, y) {
    const powerUpTypesList = Object.keys(powerUpTypes);
    const randomType = powerUpTypesList[Math.floor(Math.random() * powerUpTypesList.length)];
    
    gameState.powerUps.push({
        x: x - 10,
        y: y - 10,
        width: 20,
        height: 20,
        type: randomType,
        vx: (Math.random() - 0.5) * 2,
        vy: 1,
        life: 600 // 10秒で消滅
    });
}

// 特殊アイテムドロップ
function dropSpecialItem(x, y) {
    const specialItemsList = Object.keys(specialItems);
    const randomType = specialItemsList[Math.floor(Math.random() * specialItemsList.length)];
    
    gameState.items.push({
        x: x - 15,
        y: y - 15,
        width: 30,
        height: 30,
        type: randomType,
        vx: (Math.random() - 0.5) * 1,
        vy: 0.5,
        life: 900 // 15秒で消滅
    });
}

// パワーアップ適用
function applyPowerUp(type) {
    const powerUp = powerUpTypes[type];
    if (!powerUp) return;
    
    switch (type) {
        case 'rapidFire':
            player.powerUps.rapidFire = powerUp.duration;
            break;
        case 'maxBounces':
            player.powerUps.maxBounces = Math.min(player.powerUps.maxBounces + 1, 3);
            break;
        case 'piercing':
            player.powerUps.piercing = powerUp.duration;
            break;
        case 'explosive':
            player.powerUps.explosive = powerUp.duration;
            break;
        case 'speedUp':
            player.powerUps.speedUp = powerUp.duration;
            break;
        case 'multiShot':
            player.powerUps.multiShot = powerUp.duration;
            break;
    }
}

// 特殊アイテム適用
function applySpecialItem(type) {
    if (type === 'warp') {
        applyWarp();
        return;
    }
    
    const item = specialItems[type];
    if (!item) return;
    
    switch (type) {
        case 'shield':
            gameState.shield = item.duration;
            break;
        case 'slowMotion':
            gameState.slowMotion = true;
            setTimeout(() => {
                gameState.slowMotion = false;
            }, item.duration * 16); // フレーム数をミリ秒に変換
            break;
        case 'clearBomb':
            // 画面上の敵弾を全て消去
            gameState.enemyBullets = [];
            createClearBombEffect();
            break;
    }
}

// エフェクト作成関数
function createPowerUpEffect(x, y) {
    for (let i = 0; i < 8; i++) {
        gameState.particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            life: 20,
            maxLife: 20,
            color: '#00ff00'
        });
    }
}

function createItemEffect(x, y) {
    for (let i = 0; i < 10; i++) {
        gameState.particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 25,
            maxLife: 25,
            color: '#0088ff'
        });
    }
}

function createShieldEffect(x, y) {
    for (let i = 0; i < 12; i++) {
        gameState.particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 30,
            maxLife: 30,
            color: '#00ffff'
        });
    }
}

function createClearBombEffect() {
    // 画面全体にクリアボムエフェクト
    for (let i = 0; i < 50; i++) {
        gameState.particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 12,
            vy: (Math.random() - 0.5) * 12,
            life: 40,
            maxLife: 40,
            color: '#ff4444'
        });
    }
}

// 爆発エフェクト
function createExplosion(x, y) {
    for (let i = 0; i < 10; i++) {
        gameState.particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 30,
            maxLife: 30,
            color: `hsl(${Math.random() * 60 + 20}, 100%, 60%)`
        });
    }
}

// パーティクルの更新
function updateParticles() {
    for (let i = gameState.particles.length - 1; i >= 0; i--) {
        const particle = gameState.particles[i];
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life--;
        
        if (particle.life <= 0) {
            gameState.particles.splice(i, 1);
        }
    }
}

// 全ステージクリア表示
function showStageComplete() {
    document.getElementById('gameOver').innerHTML = `
        <div>全ステージクリア！</div>
        <div>最終スコア: <span id="finalScore">${gameState.score}</span></div>
        <button onclick="restartGame()">リスタート</button>
    `;
    document.getElementById('gameOver').style.display = 'block';
}

// 描画関数
function draw() {
    // 背景をクリア
    ctx.fillStyle = 'rgba(0, 17, 34, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 星の背景エフェクト
    for (let i = 0; i < 50; i++) {
        const x = (i * 37) % canvas.width;
        const y = (i * 23 + Date.now() * 0.01) % canvas.height;
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.5})`;
        ctx.fillRect(x, y, 1, 1);
    }
    
    // ステージクリア表示
    if (gameState.stageComplete) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#00ff00';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('ステージクリア！', canvas.width / 2, canvas.height / 2);
        ctx.font = '24px Arial';
        ctx.fillText(`ステージ ${gameState.stage} 完了`, canvas.width / 2, canvas.height / 2 + 40);
        ctx.fillText('次のステージへ...', canvas.width / 2, canvas.height / 2 + 80);
        ctx.textAlign = 'left';
    }
    
    // プレイヤーの描画
    if (player.invulnerable <= 0 || Math.floor(player.invulnerable / 5) % 2) {
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(player.x, player.y, player.width, player.height);
        
        // プレイヤーの詳細
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(player.x + 2, player.y + 2, player.width - 4, player.height - 4);
    }
    
    // 弾丸の描画
    gameState.bullets.forEach(bullet => {
        ctx.fillStyle = bullet.color;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
    
    gameState.enemyBullets.forEach(bullet => {
        ctx.fillStyle = bullet.color;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
    
    // 敵の描画
    gameState.enemies.forEach(enemy => {
        ctx.fillStyle = enemy.color;
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        
        // 敵のタイプに応じた詳細描画
        switch (enemy.type) {
            case 'basic':
                // 基本敵：シンプルな四角
                ctx.fillStyle = '#ffaaaa';
                ctx.fillRect(enemy.x + 3, enemy.y + 3, enemy.width - 6, enemy.height - 6);
                break;
            case 'circular':
                // 円形弾幕敵：円形のマーク
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 8, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'spiral':
                // 螺旋弾敵：螺旋のマーク
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = enemy.color;
                ctx.beginPath();
                ctx.arc(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 3, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'homing':
                // 追尾弾敵：矢印のマーク
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.moveTo(enemy.x + enemy.width / 2, enemy.y + 5);
                ctx.lineTo(enemy.x + 5, enemy.y + enemy.height - 5);
                ctx.lineTo(enemy.x + enemy.width - 5, enemy.y + enemy.height - 5);
                ctx.closePath();
                ctx.fill();
                break;
        }
        
        // 体力バー（体力が2以上の場合のみ表示）
        if (enemy.maxHealth > 1) {
            const barWidth = enemy.width - 4;
            const barHeight = 4;
            const healthRatio = enemy.health / enemy.maxHealth;
            
            // 背景（赤）
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(enemy.x + 2, enemy.y - 8, barWidth, barHeight);
            
            // 体力（緑）
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(enemy.x + 2, enemy.y - 8, barWidth * healthRatio, barHeight);
        }
    });
    
    // ボスの描画
    if (gameState.boss) {
        const boss = gameState.boss;
        ctx.fillStyle = boss.color;
        ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
        
        // ボスの詳細
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(boss.x + 5, boss.y + 5, boss.width - 10, boss.height - 10);
        
        // ボスの体力バー
        const barWidth = boss.width - 10;
        const barHeight = 8;
        const healthRatio = boss.health / boss.maxHealth;
        
        // 背景（赤）
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(boss.x + 5, boss.y - 15, barWidth, barHeight);
        
        // 体力（緑）
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(boss.x + 5, boss.y - 15, barWidth * healthRatio, barHeight);
        
        // フェーズ表示
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`フェーズ ${boss.phase}`, boss.x + boss.width / 2, boss.y - 20);
        ctx.textAlign = 'left';
    }
    
    // パワーアップの描画
    gameState.powerUps.forEach(powerUp => {
        const powerUpType = powerUpTypes[powerUp.type];
        ctx.fillStyle = powerUpType.color;
        ctx.fillRect(powerUp.x, powerUp.y, powerUp.width, powerUp.height);
        
        // パワーアップの詳細
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(powerUp.x + 2, powerUp.y + 2, powerUp.width - 4, powerUp.height - 4);
        
        // パワーアップ名
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(powerUpType.name, powerUp.x + powerUp.width / 2, powerUp.y - 5);
        ctx.textAlign = 'left';
    });
    
    // 特殊アイテムの描画
    gameState.items.forEach(item => {
        const itemType = specialItems[item.type];
        ctx.fillStyle = itemType.color;
        ctx.fillRect(item.x, item.y, item.width, item.height);
        
        // アイテムの詳細
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(item.x + 3, item.y + 3, item.width - 6, item.height - 6);
        
        // アイテム名
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(itemType.name, item.x + item.width / 2, item.y - 8);
        ctx.textAlign = 'left';
    });
    
    // 障害物の描画
    gameState.obstacles.forEach(obstacle => {
        ctx.fillStyle = obstacle.color;
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        
        // 障害物の詳細（より明るい色）
        ctx.fillStyle = obstacle.type === 'moving' ? '#A0522D' : '#A9A9A9';
        ctx.fillRect(obstacle.x + 2, obstacle.y + 2, obstacle.width - 4, obstacle.height - 4);
        
        // 移動障害物の矢印
        if (obstacle.type === 'moving') {
            ctx.fillStyle = '#ffffff';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('→', obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2 + 5);
            ctx.textAlign = 'left';
        } else {
            // 静的障害物のマーク
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('■', obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2 + 4);
            ctx.textAlign = 'left';
        }
    });
    
    // パーティクルの描画
    gameState.particles.forEach(particle => {
        const alpha = particle.life / particle.maxLife;
        ctx.fillStyle = particle.color.replace(')', `, ${alpha})`).replace('hsl', 'hsla');
        ctx.fillRect(particle.x, particle.y, 3, 3);
    });
}

// ゲームループ
function gameLoop() {
    if (gameState.running) {
        updatePlayer();
        updateBullets();
        spawnEnemy();
        updateEnemies();
        updateBoss();
        updatePowerUps();
        updateItems();
        updateObstacles();
        spawnObstacle();
        spawnWarpPoint();
        applyGravityField();
        updateParticles();
        checkCollisions();
        checkAchievements();
        updateUI();
    }
    
    draw();
    requestAnimationFrame(gameLoop);
}

// パワーアップ更新
function updatePowerUps() {
    for (let i = gameState.powerUps.length - 1; i >= 0; i--) {
        const powerUp = gameState.powerUps[i];
        powerUp.x += powerUp.vx;
        powerUp.y += powerUp.vy;
        powerUp.life--;
        
        if (powerUp.life <= 0 || powerUp.y > canvas.height) {
            gameState.powerUps.splice(i, 1);
        }
    }
}

// アイテム更新
function updateItems() {
    for (let i = gameState.items.length - 1; i >= 0; i--) {
        const item = gameState.items[i];
        item.x += item.vx;
        item.y += item.vy;
        item.life--;
        
        if (item.life <= 0 || item.y > canvas.height) {
            gameState.items.splice(i, 1);
        }
    }
}

// 障害物更新
function updateObstacles() {
    for (let i = gameState.obstacles.length - 1; i >= 0; i--) {
        const obstacle = gameState.obstacles[i];
        
        if (obstacle.type === 'moving') {
            obstacle.x += obstacle.vx;
            obstacle.y += obstacle.vy;
            
            // 画面端で反射
            if (obstacle.x <= 0 || obstacle.x >= canvas.width - obstacle.width) {
                obstacle.vx = -obstacle.vx;
            }
            if (obstacle.y <= 0 || obstacle.y >= canvas.height - obstacle.height) {
                obstacle.vy = -obstacle.vy;
            }
        }
        
        obstacle.life--;
        if (obstacle.life <= 0) {
            gameState.obstacles.splice(i, 1);
        }
    }
}

// 障害物生成
function spawnObstacle() {
    if (Math.random() < 0.01) { // 少し高い確率で生成
        const obstacleTypes = ['static', 'moving'];
        const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
        
        const obstacle = {
            x: Math.random() * (canvas.width - 40),
            y: Math.random() * (canvas.height - 40),
            width: 30 + Math.random() * 20,
            height: 30 + Math.random() * 20,
            type: type,
            life: 1800, // 30秒
            color: type === 'moving' ? '#8B4513' : '#696969' // 動的は茶色、静的は灰色
        };
        
        if (type === 'moving') {
            obstacle.vx = (Math.random() - 0.5) * 2;
            obstacle.vy = (Math.random() - 0.5) * 2;
        }
        
        gameState.obstacles.push(obstacle);
    }
}

// 重力場効果
function applyGravityField() {
    const gravityStrength = 0.1;
    
    // プレイヤーの弾丸に重力を適用
    gameState.bullets.forEach(bullet => {
        if (bullet.type === 'player') {
            bullet.vy += gravityStrength;
        }
    });
    
    // 敵の弾丸にも重力を適用（弱く）
    gameState.enemyBullets.forEach(bullet => {
        bullet.vy += gravityStrength * 0.5;
    });
}

// ワープポイント生成
function spawnWarpPoint() {
    if (Math.random() < 0.001) { // 非常に低い確率
        gameState.items.push({
            x: Math.random() * (canvas.width - 30),
            y: Math.random() * (canvas.height - 30),
            width: 30,
            height: 30,
            type: 'warp',
            vx: 0,
            vy: 0,
            life: 300, // 5秒で消滅
            color: '#ff00ff'
        });
    }
}

// ワープ効果
function applyWarp() {
    // プレイヤーをランダムな位置に移動
    player.x = Math.random() * (canvas.width - player.width);
    player.y = Math.random() * (canvas.height - player.height);
    
    // ワープエフェクト
    for (let i = 0; i < 20; i++) {
        gameState.particles.push({
            x: player.x + player.width / 2,
            y: player.y + player.height / 2,
            vx: (Math.random() - 0.5) * 15,
            vy: (Math.random() - 0.5) * 15,
            life: 30,
            maxLife: 30,
            color: '#ff00ff'
        });
    }
}

// アチーブメント定義
const achievements = {
    firstKill: { name: '初回撃破', description: '初めて敵を倒した', unlocked: false },
    combo10: { name: 'コンボマスター', description: '10連続で敵を倒した', unlocked: false },
    combo50: { name: 'コンボキング', description: '50連続で敵を倒した', unlocked: false },
    bossKiller: { name: 'ボスハンター', description: 'ボスを倒した', unlocked: false },
    perfectStage: { name: '完璧主義者', description: '無傷でステージをクリアした', unlocked: false },
    powerUpCollector: { name: 'コレクター', description: '10個のパワーアップを取得した', unlocked: false },
    speedDemon: { name: 'スピードデーモン', description: 'スピードアップを5回取得した', unlocked: false },
    explosionMaster: { name: '爆発の達人', description: '爆発弾で10体の敵を倒した', unlocked: false }
};

// アチーブメントチェック
function checkAchievements() {
    // 初回撃破
    if (gameState.enemiesKilled >= 1 && !achievements.firstKill.unlocked) {
        unlockAchievement('firstKill');
    }
    
    // コンボアチーブメント
    if (gameState.combo >= 10 && !achievements.combo10.unlocked) {
        unlockAchievement('combo10');
    }
    
    if (gameState.combo >= 50 && !achievements.combo50.unlocked) {
        unlockAchievement('combo50');
    }
    
    // ボス撃破
    if (gameState.boss === null && gameState.stageComplete && !achievements.bossKiller.unlocked) {
        unlockAchievement('bossKiller');
    }
    
    // パワーアップコレクター（簡易実装）
    if (gameState.score >= 5000 && !achievements.powerUpCollector.unlocked) {
        unlockAchievement('powerUpCollector');
    }
}

// アチーブメント解除
function unlockAchievement(achievementId) {
    if (achievements[achievementId] && !achievements[achievementId].unlocked) {
        achievements[achievementId].unlocked = true;
        gameState.achievements.push(achievementId);
        showAchievementNotification(achievements[achievementId].name);
    }
}

// アチーブメント通知表示
function showAchievementNotification(achievementName) {
    // 通知要素を作成
    const notification = document.createElement('div');
    notification.style.position = 'absolute';
    notification.style.top = '50%';
    notification.style.left = '50%';
    notification.style.transform = 'translate(-50%, -50%)';
    notification.style.backgroundColor = 'rgba(255, 215, 0, 0.9)';
    notification.style.color = '#000';
    notification.style.padding = '20px';
    notification.style.borderRadius = '10px';
    notification.style.fontSize = '24px';
    notification.style.fontWeight = 'bold';
    notification.style.textAlign = 'center';
    notification.style.zIndex = '1000';
    notification.style.border = '3px solid #ffd700';
    notification.innerHTML = `🏆 アチーブメント解除！<br>${achievementName}`;
    
    document.body.appendChild(notification);
    
    // 3秒後に削除
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// ゲームオーバー
function gameOver() {
    gameState.running = false;
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('gameOver').style.display = 'block';
}

// ゲームリスタート
function restartGame() {
    gameState = {
        running: true,
        score: 0,
        lives: 3,
        stage: 1,
        enemiesKilled: 0,
        enemies: [],
        bullets: [],
        enemyBullets: [],
        particles: [],
        keys: {},
        stageComplete: false,
        powerUps: [],
        items: [],
        obstacles: [],
        boss: null,
        combo: 0,
        maxCombo: 0,
        achievements: [],
        timeLimit: 0,
        slowMotion: false,
        shield: 0
    };
    
    player.x = canvas.width / 2;
    player.y = canvas.height - 50;
    player.shootCooldown = 0;
    player.invulnerable = 0;
    player.powerUps = {
        rapidFire: 0,
        maxBounces: 1,
        piercing: false,
        explosive: false,
        multiShot: 0
    };
    player.speed = player.baseSpeed;
    
    document.getElementById('gameOver').style.display = 'none';
    updateUI();
}

// UI更新
function updateUI() {
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('lives').textContent = gameState.lives;
    document.getElementById('stage').textContent = gameState.stage;
    document.getElementById('enemiesKilled').textContent = gameState.enemiesKilled;
    
    const config = stageConfigs[gameState.stage];
    document.getElementById('enemiesToKill').textContent = config.enemiesToKill;
    
    // コンボ表示を更新
    if (gameState.combo > 0) {
        if (!document.getElementById('combo')) {
            const comboDiv = document.createElement('div');
            comboDiv.id = 'combo';
            comboDiv.style.color = '#ffff00';
            comboDiv.style.fontSize = '20px';
            comboDiv.style.fontWeight = 'bold';
            document.getElementById('ui').appendChild(comboDiv);
        }
        document.getElementById('combo').textContent = `コンボ: ${gameState.combo}`;
    } else if (document.getElementById('combo')) {
        document.getElementById('combo').textContent = '';
    }
    
    // シールド表示を更新
    if (gameState.shield > 0) {
        if (!document.getElementById('shield')) {
            const shieldDiv = document.createElement('div');
            shieldDiv.id = 'shield';
            shieldDiv.style.color = '#00ffff';
            shieldDiv.style.fontSize = '16px';
            document.getElementById('ui').appendChild(shieldDiv);
        }
        document.getElementById('shield').textContent = `シールド: ${Math.ceil(gameState.shield / 60)}秒`;
    } else if (document.getElementById('shield')) {
        document.getElementById('shield').textContent = '';
    }
}

// ゲーム開始
updateUI();
gameLoop();
