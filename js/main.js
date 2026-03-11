/**
 * 游戏主入口文件
 * 负责初始化游戏和协调各个模块
 */



/**
 * 游戏主入口文件
 * 负责初始化游戏和协调各个模块
 */

// ============================
// 修复代码：处理浏览器不兼容的Node.js代码
// ============================

// 1. 修复process对象
if (typeof process === 'undefined') {
    console.log('🔄 创建浏览器兼容的process对象');
    window.process = {
        env: {
            NODE_ENV: 'development'
        },
        cwd: function () { return ''; },
        platform: 'browser'
    };
}

// 2. 确保DialogSystem存在（防御性代码）
if (typeof DialogSystem === 'undefined') {
    console.warn('⚠️ DialogSystem未定义，创建简单版本');
    window.DialogSystem = class DialogSystem {
        constructor(gameInstance) {
            console.log('📢 创建备用DialogSystem');
            this.game = gameInstance;
            this.dialogs = [];
        }
        startGameDialogs() {
            console.log('📢 备用：开始游戏对话');
        }
        cleanup() {
            console.log('📢 备用：清理对话');
        }
        reset() {
            console.log('📢 备用：重置对话系统');
        }
        triggerPassengerPlacedDialog(passenger, seat) {
            console.log(`📢 备用：乘客 ${passenger?.name} 放置到座位 ${seat?.id}`);
        }
        triggerPassengerHoverDialog(passenger) {
            console.log(`📢 备用：鼠标悬停乘客 ${passenger?.name}`);
        }
        triggerSeatHoverDialog(seat) {
            console.log(`📢 备用：鼠标悬停座位 ${seat?.id}`);
        }
        triggerSeatHoverTooltip(seat) {
            console.log(`📢 备用：座位悬停提示 ${seat?.id}`);
        }
        triggerAllPassengersSeatedDialog() {
            console.log('📢 备用：所有乘客就座');
        }
        setCarStarted() {
            console.log('📢 备用：车已启动');
        }
        checkCarNotStarted() {
            console.log('📢 备用：检查车未启动');
        }
    };
}

console.log("🚀 main.js 开始执行...");

// ============================
// js/main.js - 开头部分
// 添加等待 GameHelpers 加载的机制
// ============================

console.log("🚀 main.js 开始执行...");

// 防御性检查：如果 GameHelpers 不存在，创建空对象防止报错
if (typeof window.GameHelpers === 'undefined') {
    console.warn("⚠️ GameHelpers 未定义，创建空对象防止报错");
    window.GameHelpers = {};
}

// 等待 GameHelpers 加载的函数
// main.js 开头的 waitForGameHelpers 函数修改为：
function waitForGameHelpers(maxAttempts = 30, interval = 100) {
    return new Promise((resolve) => {
        let attempts = 0;

        const check = () => {
            attempts++;

            // 只检查 GameHelpers 是否加载，不再检查具体方法
            if (typeof window.GameHelpers !== 'undefined') {
                console.log(`✅ GameHelpers 加载完成 (尝试 ${attempts} 次)`);
                resolve();
                return;
            }

            if (attempts >= maxAttempts) {
                console.warn(`⚠️ GameHelpers 加载超时，创建空对象继续执行`);
                window.GameHelpers = window.GameHelpers || {};
                resolve();
                return;
            }

            setTimeout(check, interval);
        };

        check();
    });
}



// 游戏实例引用
let gameInstance = null;
let dialogSystem = null;
let configManager = null;



/**
 * 游戏初始化函数
 */
async function initGame() {
    console.log("🎮 开始初始化游戏...");

    try {
        // ⚠️ 关键：创建ConfigManager实例
        console.log('🔧 创建ConfigManager实例...');
        configManager = new ConfigManager();
        window.configManager = configManager;  // 注册到全局
        console.log('✅ ConfigManager实例创建成功');

        // 加载配置
        console.log('📦 加载配置数据...');
        const configLoaded = await configManager.loadAllConfigs();

        if (!configLoaded) {
            console.warn('⚠️ 配置加载可能有问题，但继续游戏');
        }

        console.log('✅ 配置加载完成');
        console.log(`  乘客数量: ${configManager.passengers?.length || 0}`);
        console.log(`  对话数量: ${configManager.dialogs?.length || 0}`);

        // 创建游戏实例
        console.log('🎲 创建游戏实例...');
        gameInstance = new BusSeatGame();
        window.gameInstance = gameInstance;

        // 初始化游戏
        gameInstance.init();

        console.log('🎉 游戏初始化完成！');

    } catch (error) {
        console.error('❌ 游戏初始化失败:', error);

        // 显示错误信息
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.9);
            color: white;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            z-index: 9999;
            max-width: 500px;
        `;
        errorDiv.innerHTML = `
            <h2>游戏初始化失败</h2>
            <p>${error.message}</p>
            <button onclick="location.reload()" style="
                margin-top: 20px;
                padding: 10px 20px;
                background: #4CAF50;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
            ">重新加载</button>
        `;
        document.body.appendChild(errorDiv);
    }
}

/**
 * 页面加载完成后启动游戏
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log("📄 DOM 内容加载完成");
    console.log("GameHelpers 状态:", typeof GameHelpers);

    // 检查当前页面是否是游戏页面
    const isGamePage = window.location.pathname.includes('bus-game.html') ||
        window.location.pathname.endsWith('bus-game.html') ||
        document.querySelector('.game-container') ||
        document.querySelector('#game-container') ||
        document.querySelector('#game-canvas');

    if (isGamePage) {
        console.log("🎮 检测到游戏页面，开始初始化游戏");

        // 延迟一小段时间以确保所有脚本加载完成
        setTimeout(() => {
            // 使用异步调用并捕获错误
            initGame().catch(error => {
                console.error("初始化游戏过程中出错:", error);

                // 显示用户友好的错误信息
                const errorDiv = document.createElement('div');
                errorDiv.style.cssText = `
                    position: fixed;
                    top: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: #f8d7da;
                    color: #721c24;
                    padding: 15px 20px;
                    border-radius: 8px;
                    border: 2px solid #f5c6cb;
                    z-index: 9999;
                    font-family: Arial, sans-serif;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    max-width: 80%;
                    text-align: center;
                `;
                errorDiv.innerHTML = `
                    <h3 style="margin: 0 0 10px 0; font-size: 18px;">⚠️ 游戏初始化失败</h3>
                    <p style="margin: 0 0 15px 0; font-size: 14px;">${error.message}</p>
                    <button onclick="location.reload()" style="
                        background: #dc3545;
                        color: white;
                        border: none;
                        padding: 8px 16px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                    ">重新加载游戏</button>
                `;
                document.body.appendChild(errorDiv);
            });
        }, 100); // 100ms 延迟，确保 gameConfig.js 已执行

    } else {
        // 主页或其他页面，只初始化工具函数
        console.log('⏸️ 非游戏页面，跳过游戏初始化');

        // 可以在这里初始化一些通用的工具函数
        if (typeof GameHelpers !== 'undefined' && GameHelpers.initGameElements) {
            console.log('🛠️ 初始化通用工具函数');
            // 可以调用一些通用的初始化方法
        }
    }
});

// 也可以监听 window.load 作为备用
window.addEventListener('load', function () {
    console.log("🖼️ 所有资源加载完成");

    // 如果 DOMContentLoaded 没有触发游戏初始化，这里可以做个检查
    setTimeout(() => {
        const gameContainer = document.querySelector('.game-container, #game-container, #game-canvas');
        if (gameContainer && typeof gameInstance === 'undefined') {
            console.log("🔄 load 事件检测到游戏页面但未初始化，尝试初始化");
            try {
                initGame();
            } catch (error) {
                console.error("load 事件中初始化失败:", error);
            }
        }
    }, 200);
});

/**
 * 全局错误处理
 */
window.addEventListener('error', (event) => {
    console.error('全局错误:', event.error);

    // 可以在这里添加错误上报逻辑
    // 例如：sendErrorToServer(event.error);

    // 防止默认错误处理
    event.preventDefault();
});

/**
 * 页面卸载前的清理工作
 */
window.addEventListener('beforeunload', () => {
    if (gameInstance) {
        // 清理游戏资源
        gameInstance.cleanup();
    }

    if (dialogSystem) {
        // 清理对话系统
        dialogSystem.cleanup();
    }

    console.log('游戏资源已清理');
});

/**
 * 全局导出（如果需要调试）
 */
window.Game = {
    gameInstance: () => gameInstance,
    dialogSystem: () => dialogSystem,
    configManager: () => configManager,
    helpers: GameHelpers,
    csvParser: CSVParser
};

/**
 * 开发工具函数（仅开发环境使用）
 */
if (process.env.NODE_ENV === 'development') {
    window.devTools = {
        // 显示调试信息
        showDebugInfo: () => {
            if (gameInstance) {
                console.group('游戏状态');
                console.log('乘客总数:', gameInstance.totalPassengers);
                console.log('已安排乘客:', gameInstance.placedCount);
                console.log('满意乘客:', gameInstance.satisfiedCount);
                console.log('游戏得分:', gameInstance.score);
                console.log('暂停状态:', gameInstance.isPaused);
                console.log('选中乘客:', gameInstance.selectedPassenger?.name || '无');
                console.groupEnd();
            }
        },

        resetGame: async () => {
            if (gameInstance && gameInstance.showRestartConfirmModal) {
                const shouldRestart = await gameInstance.showRestartConfirmModal('重置游戏', '确定要重置游戏吗？当前进度将会丢失。');
                if (shouldRestart) {
                    location.reload();
                }
            } else {
                // 备用方案：使用原始confirm
                if (confirm('确定要重新开始游戏吗？当前进度将会丢失。')) {
                    location.reload();
                }
            }
        },

        // 强制完成游戏
        forceComplete: () => {
            if (gameInstance && confirm('强制完成游戏？')) {
                gameInstance.placedCount = gameInstance.totalPassengers;
                gameInstance.checkGameComplete();
            }
        },

        // 显示所有座位状态
        showSeatStatus: () => {
            if (gameInstance) {
                console.group('座位状态');
                gameInstance.seats.forEach(seat => {
                    console.log(`座位 ${seat.id}: ${seat.occupied ? '占用' : '空置'} ${seat.passengerId ? `(乘客: ${seat.passengerId})` : ''}`);
                });
                console.groupEnd();
            }
        },

        // 显示所有乘客状态
        showPassengerStatus: () => {
            if (gameInstance) {
                console.group('乘客状态');
                gameInstance.passengers.forEach(passenger => {
                    console.log(`${passenger.name}: ${passenger.placed ? `座位 ${passenger.seatId}` : '等候区'} ${passenger.satisfied ? '✓' : '✗'}`);
                });
                console.groupEnd();
            }
        }
    };
}

// 导出初始化函数（如果需要从其他模块调用）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initGame };
}
/**
 * 显示游戏错误信息
 */
function showGameError(message) {
    // 移除现有的错误信息
    const existingError = document.getElementById('game-error');
    if (existingError) {
        existingError.remove();
    }

    // 创建错误信息
    const errorDiv = document.createElement('div');
    errorDiv.id = 'game-error';
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.95);
        color: white;
        padding: 30px;
        border-radius: 15px;
        text-align: center;
        z-index: 10000;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        border: 2px solid #E06C5D;
    `;

    errorDiv.innerHTML = `
        <div style="font-size: 60px; margin-bottom: 10px;">🚨</div>
        <h2 style="margin: 0 0 15px 0; color: #E06C5D;">游戏加载失败</h2>
        <div style="
            background: rgba(255,255,255,0.1);
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
            text-align: left;
            font-family: monospace;
            font-size: 14px;
            max-height: 150px;
            overflow-y: auto;
        ">
            <strong>错误信息：</strong><br>
            ${message}
        </div>
        <p style="color: #aaa; font-size: 14px; margin: 10px 0;">
            请检查控制台获取详细信息，或联系开发者。
        </p>
        <div style="margin-top: 20px;">
            <button onclick="location.reload()" style="
                background: linear-gradient(135deg, #E06C5D, #D04A3A);
                color: white;
                border: none;
                padding: 12px 25px;
                border-radius: 25px;
                cursor: pointer;
                font-size: 16px;
                margin: 0 10px;
                transition: all 0.3s;
            " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                🔄 重新加载游戏
            </button>
            <button onclick="console.clear(); console.log('请检查以下文件是否加载：\\n1. gameConfig.js\\n2. CSVParser.js\\n3. ConfigManager.js\\n4. BusSeatGame.js\\n5. DialogSystem.js');" style="
                background: rgba(255,255,255,0.1);
                color: white;
                border: 1px solid rgba(255,255,255,0.3);
                padding: 12px 25px;
                border-radius: 25px;
                cursor: pointer;
                font-size: 16px;
                margin: 0 10px;
                transition: all 0.3s;
            " onmouseover="this.style.transform='scale(1.05)'; this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.transform='scale(1)'; this.style.background='rgba(255,255,255,0.1)'">
                🔍 调试信息
            </button>
        </div>
    `;

    document.body.appendChild(errorDiv);
}

/**
 * 开始游戏主循环
 */
function startGameLoop() {
    console.log("🔄 开始游戏主循环");
    // 这里可以添加游戏循环逻辑

    // 示例：每帧更新
    function gameLoop() {
        // 更新游戏状态
        // 渲染游戏
        requestAnimationFrame(gameLoop);
    }
    gameLoop();
}
