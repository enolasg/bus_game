/**
 * 公交车游戏对话系统 - 逻辑文件
 * 管理游戏中的各种对话和气泡显示
 */

class DialogSystem {
    constructor(gameInstance) {
        console.log('🔧 DialogSystem 构造函数开始执行...');
        this.game = gameInstance;
        this.dialogs = [];
        this.activeDialog = null;
        this.dialogQueue = [];
        this.bubbles = new Map();
        this.tooltips = new Map();
        this.isDialogActive = false;
        this.skipRequested = false;
        this.triggeredDialogs = new Set();
        this.timers = new Map();

        // 故事对话相关属性
        this.currentStoryOverlay = null;
        this.currentStoryDialog = null;
        this.storyDialogChain = null;
        this.storyDialogIndex = 0;
        this.storyClickHandler = null;
        this.storyTimer = null;

        // 游戏状态跟踪
        this.gameStartTime = Date.now();
        this.carStarted = false;
        this.seatAssignments = new Map();
        this.conditionSystem = null;
        this.gameStartDialogsStarted = false;
        this.isProcessingClick = false;

        // 时间触发器状态
        this.timedTriggersPaused = false; // ✅ 新增：标记时间触发器是否暂停
        // ✅ 新增：保存被暂停的故事对话状态
        this.pausedStoryDialog = null;
        // 调试工具
        this.debug = {
            showAllDialogs: () => {
                console.group('📋 所有对话数据');
                this.dialogs.forEach(d => {
                    console.log(`ID:${d.id} | type:${d.trigger_type} | target:${d.trigger_target} | text:"${d.dialog_text}"`);
                });
                console.groupEnd();
            },

            showGameStartDialogs: () => {
                const startDialogs = this.getDialogsByTrigger('game_start', 'global', 'immediate');
                console.group('🎮 游戏开始对话');
                startDialogs.forEach(d => console.log(`ID:${d.id}: "${d.dialog_text}"`));
                console.groupEnd();
                return startDialogs;
            },

            testCSVPath: async () => {
                console.log('🧪 测试CSV文件路径...');
                const paths = ['../../assets/dialogs.csv', 'assets/dialogs.csv', './assets/dialogs.csv', '../assets/dialogs.csv'];

                for (const path of paths) {
                    console.log(`尝试: ${path}`);
                    try {
                        const response = await fetch(path);
                        console.log(`  状态: ${response.status} ${response.statusText}`);
                        if (response.ok) {
                            console.log(`✅ 成功！`);
                            return path;
                        }
                    } catch (e) {
                        console.log(`  失败: ${e.message}`);
                    }
                }
                console.log('❌ 所有路径都失败');
                return null;
            },

            showPassengerDialogInfo: (passengerName) => {
                const passenger = this.game.passengers.find(p => p.name === passengerName);
                if (!passenger) {
                    console.log(`未找到乘客: ${passengerName}`);
                    return;
                }

                console.group(`🔍 ${passengerName} 对话信息`);
                const passengerDialogs = this.dialogs.filter(d =>
                    d.condition_passenger &&
                    d.condition_passenger.toLowerCase() === passengerName.toLowerCase()
                );
                console.log(`乘客特定对话: ${passengerDialogs.length} 条`);
                passengerDialogs.forEach(d => {
                    console.log(`  ID:${d.id} | 类型:${d.trigger_type} | 条件:${d.trigger_condition} | 文本:"${d.dialog_text}"`);
                });
                console.groupEnd();
            },

            testTriggerDialog: (passengerName, seatId) => {
                const passenger = this.game.passengers.find(p => p.name === passengerName);
                const seat = this.game.seats.find(s => s.id === seatId);

                if (passenger && seat) {
                    console.log(`🧪 测试触发 ${passengerName} 到座位 ${seatId} 的对话`);
                    this.triggerPassengerPlacedDialog(passenger, seat);
                } else {
                    console.log(`❌ 未找到乘客 ${passengerName} 或座位 ${seatId}`);
                }
            },

            clearTriggeredDialogs: () => {
                console.log('🔄 清除所有已触发对话记录');
                this.triggeredDialogs.clear();
            }
        };

        console.log('🔧 DialogSystem 构造函数执行完成');
    }

    /**
     * 初始化对话系统
     */
    async init() {
        console.log('🚀 开始初始化对话系统...');
        try {
            await this.loadDialogs();
            this.generatePassengerDialogs();
            this.setupEventListeners();
            this.addDialogAnimations();
            this.initConditionSystem();
            console.log('🎉 对话系统初始化完成，加载了', this.dialogs.length, '条对话');
            return true;
        } catch (error) {
            console.error('❌ 对话系统初始化失败:', error);
            this.loadDefaultDialogs();
            return false;
        }
    }

    /**
     * 初始化条件对话系统
     */
    initConditionSystem() {
        try {
            if (typeof ConditionDialogsSystem === 'undefined') {
                console.warn('⚠️ ConditionDialogsSystem 未定义，条件对话功能将不可用');
                this.conditionSystem = {
                    checkAndTriggerCondition: () => { },
                    init: () => { }
                };
                return;
            }

            console.log('🔧 正在初始化条件对话系统...');
            this.conditionSystem = new ConditionDialogsSystem(this);
            if (this.conditionSystem.init) this.conditionSystem.init();
            console.log('✅ 条件对话系统初始化完成');
        } catch (error) {
            console.error('❌ 初始化条件对话系统失败:', error);
            this.conditionSystem = { checkAndTriggerCondition: () => { }, init: () => { } };
        }
    }


    async loadDialogs() {
        try {
            console.log('🔧 开始加载对话数据...');

            // ✅ 使用正确的相对路径
            const csvPath = './assets/dialogs.csv'; // 或者 '../assets/dialogs.csv'
            console.log('🔧 尝试加载CSV文件:', csvPath);

            const response = await fetch(csvPath);
            if (!response.ok) {
                console.error('❌ CSV加载失败:', response.status, response.statusText);

                // 尝试更多备用路径
                const alternativePaths = [
                    'assets/dialogs.csv',
                    './assets/dialogs.csv',
                    '../assets/dialogs.csv',
                    '/assets/dialogs.csv',
                    '../../assets/dialogs.csv'
                ];

                for (const path of alternativePaths) {
                    console.log('🔄 尝试备用路径:', path);
                    try {
                        const altResponse = await fetch(path);
                        if (altResponse.ok) {
                            const csvText = await altResponse.text();
                            console.log('✅ 从备用路径加载成功:', path);
                            this.parseCSV(csvText);

                            // ✅ 强制设置dialogs数组不为空
                            if (this.dialogs.length > 0) {
                                console.log(`✅ 成功加载 ${this.dialogs.length} 条对话`);
                                return;
                            }
                        }
                    } catch (e) {
                        console.log('❌ 备用路径失败:', path, e.message);
                    }
                }
                throw new Error(`无法加载CSV文件: ${response.status} ${response.statusText}`);
            }

            const csvText = await response.text();
            console.log('✅ CSV文件加载成功，大小:', csvText.length, '字符');
            this.parseCSV(csvText);
            console.log('✅ 对话解析完成，共', this.dialogs.length, '条对话');

        } catch (error) {
            console.error('❌ 加载对话文件失败:', error);
            this.loadDefaultDialogs();
            console.log('✅ 已加载默认对话，数量:', this.dialogs.length);
        }
    }




    /**
     * 解析CSV数据
     */
    parseCSV(csvText) {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;

            const values = this.parseCSVLine(lines[i]);
            const dialog = {};

            headers.forEach((header, index) => {
                dialog[header] = values[index] ? values[index].trim() : '';
            });

            // 转换数据类型
            dialog.id = parseInt(dialog.id);
            dialog.delay_time = parseFloat(dialog.delay_time);
            dialog.priority = parseInt(dialog.priority);
            dialog.show_time = parseFloat(dialog.show_time);
            dialog.next_dialog_id = dialog.next_dialog_id ? parseInt(dialog.next_dialog_id) : 0;
            dialog.auto_advance = dialog.auto_advance ? dialog.auto_advance.toLowerCase() === 'true' : false;
            dialog.skipable = dialog.skipable ? dialog.skipable.toLowerCase() === 'true' : true;
            dialog.duration = dialog.duration ? parseFloat(dialog.duration) : 0;
            dialog.condition_game_time = dialog.condition_game_time ? parseFloat(dialog.condition_game_time) : 0;

            // ===== 新增：解析 condition_group 字段 =====
            if (dialog.condition_group && dialog.condition_group.trim() !== '') {
                const groupParts = dialog.condition_group.split(':');
                dialog.condition_group_type = groupParts[0];
                if (groupParts.length > 1) {
                    dialog.condition_group_params = groupParts[1].split(',').map(p => p.trim());
                }
            }
            // ==========================================

            // 调试：打印故事对话的关键字段
            if (dialog.content_type === 'story') {
                console.log(`📖 故事对话 ID=${dialog.id}:`, {
                    left_character: dialog.left_character,
                    right_character: dialog.right_character,
                    speaking_side: dialog.speaking_side,
                    condition_group: dialog.condition_group
                });
            }

            this.dialogs.push(dialog);
        }
    }



    /**
     * 解析CSV行（处理引号和逗号）
     */
    parseCSVLine(line) {
        const values = [];
        let inQuotes = false;
        let currentValue = '';

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(currentValue);
                currentValue = '';
            } else {
                currentValue += char;
            }
        }

        values.push(currentValue);
        return values;
    }

    /**
     * 根据触发条件获取对话
     */
    getDialogsByTrigger(triggerType, target, condition) {
        const filteredDialogs = this.dialogs.filter(dialog => {
            const triggerMatch = dialog.trigger_type === triggerType;
            const targetMatch = !target || dialog.trigger_target === target;
            const conditionMatch = !condition || dialog.trigger_condition === condition;

            return triggerMatch && targetMatch && conditionMatch;
        });

        return filteredDialogs.sort((a, b) => a.priority - b.priority);
    }

    // 在 DialogSystem.js 中，找到合适的位置添加

    /**
     * 获取乘客特定对话
     * @param {string} passengerName 乘客名称
     * @param {string} triggerType 触发类型
     * @param {string|null} condition 条件（可选）
     * @returns {Array} 匹配的对话数组
     */
    getPassengerSpecificDialogs(passengerName, triggerType, condition = null) {
        if (!passengerName || !triggerType) {
            console.warn('getPassengerSpecificDialogs: 缺少必要参数', { passengerName, triggerType });
            return [];
        }

        return this.dialogs.filter(dialog => {
            // 检查触发类型匹配
            const triggerMatch = dialog.trigger_type === triggerType;
            // 检查乘客名称匹配
            const passengerMatch = dialog.condition_passenger &&
                dialog.condition_passenger.toLowerCase() === passengerName.toLowerCase();
            // 检查条件匹配（如果有条件参数）
            const conditionMatch = !condition || dialog.trigger_condition === condition;

            return triggerMatch && passengerMatch && conditionMatch;
        });
    }

    /**
     * 获取条件特定对话
     * @param {string} passengerName 乘客名称
     * @param {string} condition 条件
     * @returns {Array} 匹配的对话数组
     */
    getConditionSpecificDialogs(passengerName, condition) {
        if (!passengerName || !condition) {
            console.warn('getConditionSpecificDialogs: 缺少必要参数', { passengerName, condition });
            return [];
        }

        return this.dialogs.filter(dialog => {
            // 检查触发类型
            const triggerMatch = dialog.trigger_type === 'condition_specific';
            // 检查内容类型
            const contentMatch = dialog.content_type === 'bubble';
            // 检查乘客名称
            const passengerMatch = dialog.condition_passenger &&
                dialog.condition_passenger.toLowerCase() === passengerName.toLowerCase();
            // 检查条件
            const conditionMatch = dialog.trigger_condition === condition;

            return triggerMatch && contentMatch && passengerMatch && conditionMatch;
        });
    }

    /**
     * 获取通用类型对话
     * @param {string} triggerType 触发类型
     * @param {string} target 目标
     * @param {string} condition 条件
     * @returns {Array} 匹配的对话数组
     */
    getGeneralDialogs(triggerType, target, condition) {
        return this.dialogs.filter(dialog =>
            dialog.trigger_type === triggerType &&
            dialog.trigger_target === target &&
            dialog.trigger_condition === condition &&
            (!dialog.condition_passenger || dialog.condition_passenger.trim() === '')
        );
    }



    /**
     * 从乘客数据生成通用对话
     * ✅ 修改：不再从乘客CSV生成对话，全部使用dialogs.csv
     */
    generatePassengerDialogs() {

        return; // 直接返回，不生成任何对话
    }

    /**
     * 设置事件监听
     */
    setupEventListeners() {
        console.log('🔧 DialogSystem: 设置事件监听器...');

        // ✅ 移除旧的点击监听器（如果有）
        if (this.clickListener) {
            document.removeEventListener('click', this.clickListener);
        }

        // ✅ 全局点击事件 - 只用于弹窗对话前进，不影响故事对话
        this.clickListener = (e) => {
            // 当有活动弹窗对话时，点击任意位置（除了跳过按钮）都继续
            // ✅ 注意：this.isDialogActive 是弹窗对话的标记，不是故事对话的标记
            if (this.isDialogActive && !e.target.closest('.dialog-skip-btn') && !e.target.closest('.story-overlay')) {
                console.log('🔧 弹窗对话：点击弹窗，准备前进');
                console.log('弹窗对话状态:', {
                    isDialogActive: this.isDialogActive,
                    activeDialog: this.activeDialog
                });

                // ✅ 关键：阻止事件冒泡，防止被其他监听器处理
                e.stopPropagation();
                e.preventDefault();

                // 防止重复点击
                if (this.isProcessingClick) {
                    console.log('点击处理中，跳过');
                    return;
                }

                this.isProcessingClick = true;

                // ✅ 直接调用弹窗前进方法
                this.advanceDialog();

                // 重置点击状态
                setTimeout(() => {
                    this.isProcessingClick = false;
                }, 300);
            }

            // ✅ 故事对话有自己独立的点击事件，这里不处理
        };

        // ✅ 使用捕获阶段，确保优先处理
        document.addEventListener('click', this.clickListener, true);

        // ESC键跳过对话（只跳过弹窗对话）
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isDialogActive) {
                this.skipDialog();
            }
        });

        // 添加一个点击提示样式
        this.addClickHintStyle();

        console.log('✅ DialogSystem: 事件监听器设置完成');
    }





    /**
     * 添加点击提示样式
     */
    addClickHintStyle() {
        if (!document.querySelector('#click-hint-style')) {
            const style = document.createElement('style');
            style.id = 'click-hint-style';
            style.textContent = `
                .dialog-container::after {
                    content: '点击任意位置继续';
                    position: absolute;
                    bottom: 15px;
                    right: 20px;
                    font-size: 12px;
                    color: rgba(255, 255, 255, 0.7);
                    font-style: italic;
                    animation: pulse 2s infinite;
                }
                
                .dialog-skip-btn {
                    position: absolute;
                    top: 15px;
                    right: 15px;
                    background: rgba(0, 0, 0, 0.3);
                    color: rgba(255, 255, 255, 0.8);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    padding: 4px 8px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                }
                
                .dialog-skip-btn:hover {
                    background: rgba(0, 0, 0, 0.5);
                    color: white;
                }
                
                .dialog-container {
                    cursor: pointer;
                }
                
                .dialog-container:hover .dialog-content {
                    opacity: 0.95;
                }
                
                @keyframes pulse {
                    0% { opacity: 0.5; }
                    50% { opacity: 1; }
                    100% { opacity: 0.5; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * 加载默认对话（备用）
     */
    loadDefaultDialogs() {
        this.dialogs = [
            {
                id: 1,
                trigger_type: 'game_start',
                trigger_target: 'global',
                trigger_condition: 'immediate',
                delay_time: 0,
                priority: 1,
                content_type: 'narrative',
                dialog_text: '欢迎来到公交车座位安排游戏！',
                icon: '',
                sound: '',
                next_dialog_id: 2,
                auto_advance: true,
                show_time: 3,
                character_name: '系统提示',
                character_emotion: 'normal'
            },
            {
                id: 2,
                trigger_type: 'game_start',
                trigger_target: 'global',
                trigger_condition: 'immediate',
                delay_time: 0,
                priority: 1,
                content_type: 'narrative',
                dialog_text: '请根据乘客的需求为他们安排合适的座位',
                icon: '',
                sound: '',
                next_dialog_id: 3,
                auto_advance: true,
                show_time: 3,
                character_name: '系统提示',
                character_emotion: 'normal'
            },
            {
                id: 3,
                trigger_type: 'game_start',
                trigger_target: 'global',
                trigger_condition: 'immediate',
                delay_time: 0,
                priority: 1,
                content_type: 'narrative',
                dialog_text: '目标是让尽可能多的乘客满意！点击屏幕开始游戏',
                icon: '',
                sound: '',
                next_dialog_id: 0,
                auto_advance: true,
                show_time: 4,
                character_name: '系统提示',
                character_emotion: 'normal'
            }
        ];
    }

    /**
     * 显示错误对话框
     */
    showErrorDialog(message) {
        console.error('显示错误对话框:', message);

        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(231, 76, 60, 0.9);
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            z-index: 10001;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
            font-family: 'Microsoft YaHei', sans-serif;
            font-size: 16px;
            max-width: 80%;
            text-align: center;
        `;
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);

        setTimeout(() => {
            if (errorDiv.parentNode) errorDiv.remove();
        }, 5000);
    }

    /*****************************************************************
     * 故事对话系统核心方法
     *****************************************************************/


    /**
     * 显示故事对话（左下角角色对话，不暂停游戏）
     */
    showStoryDialog(dialog, passenger = null) {
        console.log('🎭 显示故事对话（左下角）:', dialog.dialog_text);
        console.log('📋 对话完整数据:', {
            id: dialog.id,
            content_type: dialog.content_type,
            trigger_type: dialog.trigger_type,
            speaking_side: dialog.speaking_side,
            left_character: dialog.left_character,
            right_character: dialog.right_character
        });

        // ✅ 关键修复：检查CSV中的content_type字段名
        // 有些CSV可能使用'content_type'，有些可能使用'type'
        const contentType = dialog.content_type || dialog.type || '';

        // 放宽检查条件：如果content_type包含'story'或者trigger_type是'game_start'且是郭嘉贾诩对话
        const isStoryDialog =
            contentType.toLowerCase().includes('story') ||
            (dialog.id >= 100 && dialog.id <= 102) || // 郭嘉贾诩对话ID范围
            (dialog.left_character && dialog.right_character); // 有左右角色

        if (!isStoryDialog) {
            console.warn('⚠️ 尝试显示非故事类型对话为故事:', contentType);
            return;
        }

        // 使用HTML中已有的story-overlay元素
        const storyOverlay = document.getElementById('story-overlay');
        if (!storyOverlay) {
            console.error('❌ 未找到story-overlay元素');
            return;
        }

        // ✅ 显示对话框
        storyOverlay.style.display = 'flex';
        storyOverlay.style.opacity = '1';
        console.log('🎯 显示故事对话overlay');

        // 设置故事对话相关状态
        this.currentStoryDialog = dialog;
        this.isStoryDialog = true;
        this.skipRequested = false;

        // 初始化对话链
        this.storyDialogChain = this.buildStoryDialogChain(dialog);
        this.storyDialogIndex = 0;
        console.log('📊 故事对话链初始化:', {
            链长度: this.storyDialogChain.length,
            当前索引: this.storyDialogIndex,
            第一条对话: this.storyDialogChain[0]?.dialog_text
        });

        // 更新界面内容
        this.updateStoryDialog(dialog);

        // ✅ 添加点击事件
        const dialogSystem = this;
        const storyClickHandler = (e) => {
            console.log('👆 故事对话框被点击');
            dialogSystem.advanceStoryDialog();
        };

        // 移除旧的点击事件（如果存在）
        if (this.storyClickHandler) {
            storyOverlay.removeEventListener('click', this.storyClickHandler);
        }

        storyOverlay.addEventListener('click', storyClickHandler);
        this.storyClickHandler = storyClickHandler;

        console.log('✅ 故事对话已显示');
    }




    /**
     * 构建故事对话链
     * @param {Object} firstDialog 第一条对话
     * @returns {Array} 对话链数组
     */
    buildStoryDialogChain(firstDialog) {
        console.log('🔗 开始构建对话链，起始ID:', firstDialog.id);

        const chain = [firstDialog];
        let currentId = firstDialog.next_dialog_id;
        console.log('起始next_dialog_id:', currentId);

        while (currentId > 0) {
            const nextDialog = this.dialogs.find(d => d.id === currentId);
            console.log('查找ID:', currentId, '找到:', nextDialog);

            if (nextDialog && nextDialog.content_type === 'story') {
                chain.push(nextDialog);
                currentId = nextDialog.next_dialog_id;
                console.log('添加到链中，下一个ID:', currentId);
            } else {
                console.log('对话链终止: 找不到对话或不是story类型');
                break;
            }
        }

        console.log(`📚 构建完成: ${chain.length} 条对话`, chain.map(d => d.id));
        return chain;
    }


    /**
     * 前进到下一个故事对话
     */
    advanceStoryDialog() {
        console.log('📖 advanceStoryDialog 被调用');
        console.log('当前状态:', {
            storyDialogChain: this.storyDialogChain,
            storyDialogIndex: this.storyDialogIndex,
            currentStoryDialog: this.currentStoryDialog,
            nextId: this.currentStoryDialog?.next_dialog_id
        });

        // ✅ 如果没有当前对话，直接返回
        if (!this.currentStoryDialog) {
            console.warn('⚠️ 没有当前故事对话');
            this.hideStoryDialog(); // 确保隐藏
            return;
        }

        // 优先从对话链获取下一条对话
        if (this.storyDialogChain && this.storyDialogIndex < this.storyDialogChain.length - 1) {
            this.storyDialogIndex++;
            const nextDialog = this.storyDialogChain[this.storyDialogIndex];

            if (nextDialog) {
                console.log(`📚 从对话链获取下一条: ID=${nextDialog.id}, 索引=${this.storyDialogIndex}`);

                // 更新当前对话引用
                this.currentStoryDialog = nextDialog;

                // 更新界面内容
                this.updateStoryDialog(nextDialog);

                // 播放音效（如果有）
                if (nextDialog.sound) {
                    this.playSound(nextDialog.sound);
                }

                console.log('✅ 已前进到对话链中的下一条');
                return;
            }
        }

        // 然后检查next_dialog_id
        const nextId = this.currentStoryDialog.next_dialog_id;

        if (nextId > 0) {
            console.log(`🔗 当前对话有下一个ID: ${nextId}`);

            // 查找下一个对话
            const nextDialog = this.dialogs.find(d => d.id === nextId);

            if (nextDialog) {
                console.log(`➡️ 找到下一个对话: ID=${nextDialog.id}`);

                // 更新当前对话引用
                this.currentStoryDialog = nextDialog;

                // 更新storyDialogIndex（如果下一个对话在对话链中）
                if (this.storyDialogChain) {
                    const newIndex = this.storyDialogChain.findIndex(d => d.id === nextId);
                    if (newIndex !== -1) {
                        this.storyDialogIndex = newIndex;
                    }
                }

                // 更新界面内容
                this.updateStoryDialog(nextDialog);

                // 播放音效（如果有）
                if (nextDialog.sound) {
                    this.playSound(nextDialog.sound);
                }

                console.log('✅ 已前进到下一条对话');
                return;
            } else {
                console.warn(`❌ 未找到下一个对话 ID: ${nextId}`);
            }
        }

        // ✅ 修复：所有对话都结束了，正确隐藏对话框
        console.log('🏁 故事对话结束，隐藏对话框');
        this.hideStoryDialog();
    }



    /**
     * 更新故事对话界面
     */
    updateStoryDialog(dialog) {
        console.log('🔄 更新故事对话界面:', dialog.dialog_text);
        console.log('📋 对话数据:', {
            id: dialog.id,
            speaking_side: dialog.speaking_side,
            left_character: dialog.left_character,
            right_character: dialog.right_character
        });

        const storyText = document.getElementById('story-text');
        const leftCharacter = document.getElementById('left-character');
        const rightCharacter = document.getElementById('right-character');
        const leftCharacterName = document.getElementById('left-character-name');
        const rightCharacterName = document.getElementById('right-character-name');
        const leftCharacterAvatar = document.getElementById('left-character-avatar');
        const rightCharacterAvatar = document.getElementById('right-character-avatar');
        const storyBubble = document.getElementById('story-bubble');
        const storyOverlay = document.getElementById('story-overlay');

        if (!storyText) {
            console.error('❌ 未找到story-text元素');
            return;
        }

        if (storyOverlay) {
            storyOverlay.style.display = 'flex';
            storyOverlay.style.opacity = '1';
        }

        storyText.textContent = dialog.dialog_text;

        // 更新角色名称
        if (leftCharacterName && dialog.left_character) {
            leftCharacterName.textContent = dialog.left_character;
        }
        if (rightCharacterName && dialog.right_character) {
            rightCharacterName.textContent = dialog.right_character;
        }

        // 更新角色头像 - 使用 left_character 和 right_character
        if (leftCharacterAvatar && dialog.left_character) {
            const leftPassenger = this.game.passengers.find(p => p.name === dialog.left_character);
            if (leftPassenger && leftPassenger.icon) {
                leftCharacterAvatar.src = leftPassenger.icon;
                leftCharacterAvatar.alt = dialog.left_character;
                console.log(`设置左侧头像: ${dialog.left_character} -> ${leftPassenger.icon}`);
            } else {
                console.warn(`未找到左侧角色头像: ${dialog.left_character}`);
            }
        }

        if (rightCharacterAvatar && dialog.right_character) {
            const rightPassenger = this.game.passengers.find(p => p.name === dialog.right_character);
            if (rightPassenger && rightPassenger.icon) {
                rightCharacterAvatar.src = rightPassenger.icon;
                rightCharacterAvatar.alt = dialog.right_character;
                console.log(`设置右侧头像: ${dialog.right_character} -> ${rightPassenger.icon}`);
            } else {
                console.warn(`未找到右侧角色头像: ${dialog.right_character}`);
            }
        }

        // 调用视觉更新方法
        this.updateStoryDialogVisuals(dialog);

        storyText.style.display = 'block';
        storyText.style.visibility = 'visible';
        storyText.style.opacity = '1';

        console.log('✅ 界面更新完成');
    }




    /**
     * 根据文本长度调整气泡宽度
     * @param {HTMLElement} bubble 气泡元素
     * @param {string} text 对话文本
     */
    adjustBubbleWidth(bubble, text) {
        if (!bubble) return;

        const textLength = text.length;

        // 移除旧的宽度类
        bubble.classList.remove('short-text', 'medium-text', 'long-text');

        // 根据文本长度设置宽度类
        if (textLength <= 20) {
            bubble.classList.add('short-text');
            console.log('📏 短文本，设置短宽度');
        } else if (textLength <= 40) {
            bubble.classList.add('medium-text');
            console.log('📏 中等文本，设置中等宽度');
        } else {
            bubble.classList.add('long-text');
            console.log('📏 长文本，设置长宽度');
        }

        // 添加CSS变量以便更精确控制
        bubble.style.setProperty('--text-length', textLength);
    }



    /**
     * 更新故事对话视觉效果
     * @param {Object} dialog 对话对象
     */
    /**
   * 更新故事对话视觉效果
   * @param {Object} dialog 对话对象
   */
    updateStoryDialogVisuals(dialog) {
        const isLeftSpeaking = dialog.speaking_side && dialog.speaking_side.toLowerCase() === 'left';
        const leftCharacter = document.getElementById('left-character');
        const rightCharacter = document.getElementById('right-character');
        const storyBubble = document.getElementById('story-bubble');

        console.log('🎭 更新视觉效果:', {
            说话者: dialog.speaking_side,
            左侧角色: dialog.left_character,
            右侧角色: dialog.right_character,
            左侧元素: leftCharacter,
            右侧元素: rightCharacter,
            气泡元素: storyBubble
        });

        if (!leftCharacter || !rightCharacter || !storyBubble) {
            console.error('❌ 视觉元素未找到');
            return;
        }

        // 移除所有高亮
        leftCharacter.classList.remove('active');
        rightCharacter.classList.remove('active');

        // 移除所有箭头类
        storyBubble.classList.remove('arrow-left', 'arrow-right');

        // 根据说话者设置高亮和箭头
        if (isLeftSpeaking) {
            leftCharacter.classList.add('active');
            storyBubble.classList.add('arrow-left');
            console.log('🎯 设置左侧角色高亮，左侧箭头');
        } else {
            rightCharacter.classList.add('active');
            storyBubble.classList.add('arrow-right');
            console.log('🎯 设置右侧角色高亮，右侧箭头');
        }

        console.log(`🎭 视觉更新完成: ${isLeftSpeaking ? dialog.left_character : dialog.right_character} 正在说话`);
    }


    /**
     * 根据角色名获取头像路径
     * @param {string} characterName 角色名
     * @returns {string} 头像URL
     */
    getCharacterAvatar(characterName) {
        console.log(`🖼️ getCharacterAvatar 被调用: "${characterName}"`);

        if (!characterName || characterName.trim() === '') {
            console.warn('❌ 角色名为空');
            return this.getDefaultAvatar();
        }

        const cleanName = characterName.trim();

        // 从游戏乘客数据获取
        if (this.game && this.game.passengers && Array.isArray(this.game.passengers)) {
            console.log(`🔍 在 ${this.game.passengers.length} 名乘客中查找 "${cleanName}"`);

            // 精确匹配
            const exactMatch = this.game.passengers.find(p =>
                p.name && p.name.trim() === cleanName
            );

            if (exactMatch) {
                if (exactMatch.icon && exactMatch.icon.trim() !== '') {
                    console.log(`✅ 精确匹配找到 ${cleanName}: ${exactMatch.icon}`);
                    return exactMatch.icon;
                } else if (exactMatch.angryIcon && exactMatch.angryIcon.trim() !== '') {
                    console.log(`✅ 使用 ${cleanName} 的生气头像: ${exactMatch.angryIcon}`);
                    return exactMatch.angryIcon;
                }
            }

            console.log(`❌ 在乘客数据中未找到 "${cleanName}"`);
        }

        // 返回默认头像
        return this.getDefaultAvatar();
    }

    /**
     * 获取默认头像
     * @returns {string} 默认头像URL
     */
    getDefaultAvatar() {
        console.log('⚪ 使用默认头像');

        // SVG默认头像
        const svgString = `<svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="40" cy="40" r="38" fill="#4A6572" stroke="#E06C5D" stroke-width="3"/>
            <text x="40" y="48" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="24" font-weight="bold">?</text>
        </svg>`;

        const base64 = btoa(unescape(encodeURIComponent(svgString)));
        return `data:image/svg+xml;base64,${base64}`;
    }

    /**
     * 隐藏故事对话框
     */
    hideStoryDialog() {
        console.log('❌ hideStoryDialog 被调用');

        // 清除计时器
        if (this.storyTimer) {
            clearTimeout(this.storyTimer);
            this.storyTimer = null;
        }

        // 获取故事对话框元素
        const storyOverlay = document.getElementById('story-overlay');

        if (storyOverlay) {
            console.log('✅ 找到story-overlay元素，开始隐藏');

            // 移除点击事件
            if (this.storyClickHandler) {
                storyOverlay.removeEventListener('click', this.storyClickHandler);
                this.storyClickHandler = null;
            }

            // 淡出动画
            storyOverlay.style.opacity = '0';
            storyOverlay.style.transition = 'opacity 0.3s ease';

            // 延迟移除
            setTimeout(() => {
                if (storyOverlay.parentNode) {
                    storyOverlay.style.display = 'none';
                    storyOverlay.style.opacity = '1'; // 重置透明度
                    console.log('✅ 故事对话框已隐藏');
                }
            }, 300);
        } else {
            console.warn('⚠️ 未找到story-overlay元素');
        }

        // 重置状态
        this.currentStoryDialog = null;
        this.storyDialogChain = null;
        this.storyDialogIndex = 0;
        this.isStoryDialog = false; // ✅ 重要：重置故事对话状态
    }

    /**
         * 触发对话
         * @param {Object} dialog 对话对象
         * @param {HTMLElement} targetElement 目标元素（可选）
         * @param {Object} passenger 乘客对象（可选）
         */
    triggerDialog(dialog, targetElement = null, passenger = null) {
        if (!dialog) return;

        // ✅ 核心修改：气泡（bubble）完全不进行“已触发”检查，允许无限次重复
        if (dialog.content_type !== 'bubble') {
            if (this.triggeredDialogs.has(dialog.id)) {
                return;
            }
            this.triggeredDialogs.add(dialog.id);
        }

        // 如果没有传入 targetElement 但有 passenger，尝试自动补全
        if (!targetElement && passenger && passenger.element) {
            targetElement = passenger.element;
        }

        setTimeout(() => {
            // 游戏暂停处理（保持不变）
            if (this.game && this.game.isPaused && dialog.content_type !== 'story') {
                setTimeout(() => this.triggerDialog(dialog, targetElement, passenger), 100);
                return;
            }

            switch (dialog.content_type) {
                case 'story': this.showStoryDialog(dialog, passenger); break;
                case 'bubble': this.showBubbleDialog(dialog, targetElement, passenger); break;
                case 'narrative': this.showNarrativeDialog(dialog); break;
                default: this.showBubbleDialog(dialog, targetElement, passenger);
            }
        }, (dialog.delay_time || 0) * 1000);
    }


    /**
     * 暂停时间相关触发器
     */
    pauseTimedTriggers() {
        console.log('⏸️ 暂停时间相关触发器');

        // 清除所有时间相关的计时器
        this.timers.forEach((timer, key) => {
            if (key.includes('timer_') || key.includes('timed_')) {
                clearTimeout(timer);
                this.timers.delete(key);
                console.log(`清除时间触发器: ${key}`);
            }
        });

        // 标记触发器为暂停状态
        this.timedTriggersPaused = true;
    }

    /**
     * 恢复时间相关触发器
     */
    resumeTimedTriggers() {
        console.log('▶️ 恢复时间相关触发器');

        this.timedTriggersPaused = false;

        // 重新启动时间触发器检查
        if (this.game) {
            // 立即检查一次
            setTimeout(() => {
                this.checkTimedTriggers();
            }, 100);
        }
    }




    /**
     * 显示强制剧情对话（弹窗类型，暂停游戏）
     * @param {Object} dialog 对话对象
     */
    showNarrativeDialog(dialog) {
        console.log('🔧 显示剧情弹窗对话（暂停游戏）:', dialog.dialog_text);
        // ✅ 关键：如果有正在显示的故事对话，先隐藏它
        this.hideStoryDialogIfShowing();
        // ✅ 关键检查：确保这是弹窗类型
        if (dialog.content_type !== 'narrative') {
            console.warn('⚠️ 尝试显示非弹窗类型对话为弹窗:', dialog.content_type);
            return;
        }

        // ✅ 关键：暂停游戏计时和所有时间相关触发器
        if (this.game) {
            console.log('⏸️ 暂停游戏计时和触发器');

            // 暂停游戏计时
            if (this.game.pauseGameTimer) {
                this.game.pauseGameTimer();
            }

            // 暂停对话系统的时间触发器
            this.pauseTimedTriggers();
        }

        // ✅ 检查是否已有弹窗，如果有则更新内容而不是新建
        let overlay = document.querySelector('.dialog-overlay');
        let dialogContainer = document.querySelector('.dialog-container');

        if (this.isDialogActive && overlay && dialogContainer) {
            // 更新现有弹窗内容
            this.updateDialogContent(dialogContainer, dialog);
            this.activeDialog = dialog;
            return;
        }

        // 如果没有活动弹窗，则创建新的
        overlay = this.createDialogOverlay();
        dialogContainer = this.createDialogContainer(dialog);

        overlay.appendChild(dialogContainer);
        document.body.appendChild(overlay);

        // ✅ 关键：弹窗对话暂停游戏
        this.isDialogActive = true;  // 这个标记会影响游戏暂停
        this.activeDialog = dialog;  // 设置当前活动弹窗
        this.skipRequested = false;

        // ✅ 给弹窗覆盖层添加直接点击事件
        const dialogSystem = this;
        overlay.addEventListener('click', function (e) {
            // ✅ 确保点击的是覆盖层本身
            if (e.target === this) {
                console.log('✅ 弹窗覆盖层被直接点击');
                dialogSystem.advanceDialog();
            }
        });

        // 播放音效（如果有）
        if (dialog.sound) {
            this.playSound(dialog.sound);
        }

        // ✅ 只有明确设置了 auto_advance 才自动前进
        if (dialog.auto_advance && dialog.show_time > 0) {
            const timer = setTimeout(() => {
                if (this.isDialogActive && this.activeDialog === dialog) {
                    this.advanceDialog();
                }
            }, dialog.show_time * 1000);

            this.timers.set(dialog.id, timer);
        }

        console.log('✅ 弹窗对话已显示（游戏暂停）');
    }

    /**
     * 隐藏正在显示的故事对话（如果有）
     */
    hideStoryDialogIfShowing() {
        const storyOverlay = document.getElementById('story-overlay');
        if (storyOverlay && storyOverlay.style.display !== 'none') {
            console.log('⏸️ 系统提示期间，暂停故事对话显示');

            // ✅ 保存当前故事对话状态，以便稍后恢复
            if (this.currentStoryDialog) {
                this.pausedStoryDialog = {
                    dialog: this.currentStoryDialog,
                    chain: this.storyDialogChain,
                    index: this.storyDialogIndex
                };
                console.log(`⏸️ 保存故事对话状态: ID=${this.currentStoryDialog.id}`);
            }

            // 隐藏但不重置状态
            storyOverlay.style.display = 'none';
        }
    }


    /**
     * 隐藏当前弹窗
     */
    hideCurrentDialog() {
        console.log('隐藏当前弹窗');

        const overlay = document.querySelector('.dialog-overlay');
        if (overlay) {
            overlay.classList.add('fade-out');
            setTimeout(() => {
                if (overlay.parentNode) overlay.remove();

                // ✅ 确保游戏界面恢复显示
                document.body.style.overflow = 'auto';

                // ✅ 强制重新渲染乘客
                if (this.game) {
                    console.log('🔄 强制重新渲染乘客');

                    // 重新渲染等候区的乘客
                    this.game.renderWaitingPassengers();

                    // 重新渲染已放置的乘客
                    this.game.passengers.forEach(passenger => {
                        if (passenger.placed && passenger.seatId) {
                            const seat = this.game.seats.find(s => s.id === passenger.seatId);
                            if (seat) {
                                this.game.addPassengerToSeat(passenger, seat);
                            }
                        }
                    });

                    // 更新UI
                    this.game.updateUI();
                }
            }, 300);
        } else {
            // 即使没有overlay，也要恢复
            document.body.style.overflow = 'auto';
        }

        // 清除所有计时器
        this.timers.forEach((timer, key) => clearTimeout(timer));
        this.timers.clear();

        this.isDialogActive = false;
        this.activeDialog = null;
        this.dialogQueue = [];
    }


    /**
     * 触发游戏开始后的故事对话
     */
    triggerGameStartStoryDialogs() {
        console.log('🎭 触发游戏开始后的故事对话');

        // 获取所有游戏开始类型的故事对话
        const gameStartStoryDialogs = this.dialogs.filter(dialog =>
            dialog.content_type === 'story' &&
            dialog.trigger_type === 'game_start'
        );

        console.log(`找到 ${gameStartStoryDialogs.length} 个游戏开始故事对话`);

        if (gameStartStoryDialogs.length > 0) {
            // 按ID排序，确保按顺序触发
            gameStartStoryDialogs.sort((a, b) => a.id - b.id);

            // 只触发第一个（其他的可能通过对话链连接）
            const firstStoryDialog = gameStartStoryDialogs[0];

            console.log(`触发故事对话 ID=${firstStoryDialog.id}: "${firstStoryDialog.dialog_text}"`);

            // 使用triggerDialog方法触发，确保正确处理
            this.triggerDialog(firstStoryDialog);
        } else {
            console.log('⚠️ 没有找到游戏开始故事对话');
        }
    }

    /**
     * 检查并触发被延迟的故事对话
     */
    checkDelayedStoryDialogs() {
        console.log('🔍 检查被延迟的故事对话');

        // 检查是否有应该在游戏开始后触发的故事对话
        const storyDialogs = this.dialogs.filter(dialog =>
            dialog.content_type === 'story' &&
            dialog.trigger_type === 'game_start'
        );

        if (storyDialogs.length > 0 && !this.isDialogActive) {
            console.log(`找到 ${storyDialogs.length} 个游戏开始故事对话`);

            // 按ID排序，显示第一个
            storyDialogs.sort((a, b) => a.id - b.id);
            const firstStoryDialog = storyDialogs[0];

            console.log('🎭 触发游戏开始故事对话:', firstStoryDialog.id);
            this.triggerDialog(firstStoryDialog);
        }
    }


    /**
     * 创建对话覆盖层
     */
    createDialogOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10000;
            background: rgba(0, 0, 0, 0.7);
            cursor: pointer;
        `;

        return overlay;
    }

    /**
     * 创建对话容器
     */
    createDialogContainer(dialog) {
        const container = document.createElement('div');
        container.className = 'dialog-container';

        // 角色名称区域
        if (dialog.character_name) {
            const nameSection = document.createElement('div');
            nameSection.className = 'dialog-character-name';
            nameSection.textContent = dialog.character_name;
            container.appendChild(nameSection);
        }

        // 对话内容
        const content = document.createElement('div');
        content.className = 'dialog-content';
        content.textContent = dialog.dialog_text;
        container.appendChild(content);

        // 跳过按钮
        const skipBtn = document.createElement('button');
        skipBtn.className = 'dialog-skip-btn';
        skipBtn.innerHTML = '<i class="fas fa-forward"></i> 跳过 (ESC)';
        skipBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.skipDialog();
        });
        container.appendChild(skipBtn);

        // 下一步提示
        const hint = document.createElement('div');
        hint.className = 'dialog-next-hint';
        hint.innerHTML = '<i class="fas fa-mouse-pointer"></i> 点击继续';
        container.appendChild(hint);

        return container;
    }

    /**
     * 更新现有弹窗内容
     */
    updateDialogContent(dialogContainer, dialog) {
        console.log('更新弹窗内容:', dialog.dialog_text);

        dialogContainer.classList.add('updating');

        // 更新角色名称
        const nameSection = dialogContainer.querySelector('.dialog-character-name');
        if (nameSection && dialog.character_name) {
            nameSection.textContent = dialog.character_name;
        }

        // 更新对话内容
        const content = dialogContainer.querySelector('.dialog-content');
        if (content) {
            content.textContent = dialog.dialog_text;
        }

        setTimeout(() => {
            dialogContainer.classList.remove('updating');
        }, 300);

        // 播放音效
        if (dialog.sound) {
            this.playSound(dialog.sound);
        }

        // 设置新的计时器
        if (this.activeDialog && this.timers.has(this.activeDialog.id)) {
            clearTimeout(this.timers.get(this.activeDialog.id));
            this.timers.delete(this.activeDialog.id);
        }

        if (dialog.auto_advance && dialog.show_time > 0) {
            const timer = setTimeout(() => {
                if (this.isDialogActive && this.activeDialog === dialog) {
                    this.advanceDialog();
                }
            }, dialog.show_time * 1000);
            this.timers.set(dialog.id, timer);
        }
    }

    /**
     * 前进到下一段对话
     */
    advanceDialog() {
        if (!this.activeDialog) return;

        const nextId = this.activeDialog.next_dialog_id;

        if (nextId > 0) {
            const nextDialog = this.dialogs.find(d => d.id === nextId);
            if (nextDialog) {
                console.log('前进到下一条对话，仅更新内容:', nextDialog.dialog_text);
                this.updateCurrentDialogContent(nextDialog);
                this.activeDialog = nextDialog;

                // 设置新的计时器
                if (nextDialog.auto_advance && nextDialog.show_time > 0) {
                    if (this.activeDialog && this.timers.has(this.activeDialog.id)) {
                        clearTimeout(this.timers.get(this.activeDialog.id));
                        this.timers.delete(this.activeDialog.id);
                    }

                    const timer = setTimeout(() => {
                        if (this.isDialogActive && this.activeDialog === nextDialog) {
                            this.advanceDialog();
                        }
                    }, nextDialog.show_time * 1000);
                    this.timers.set(nextDialog.id, timer);
                }
            }
        } // 在 advanceDialog 方法的末尾，找到以下代码块并修改：

        // 在 advanceDialog 方法的末尾，找到以下代码块并修改：

        else {
            console.log('对话链结束，移除弹窗');

            // ✅ 关键修改：先恢复游戏界面，再触发后续对话
            console.log('🎬 游戏开始对话结束，准备恢复游戏界面');

            // 1. 恢复游戏计时
            if (this.game) {
                // 重置游戏开始时间为现在
                this.game.gameStartTime = Date.now();
                this.game.elapsedSeconds = 0;

                console.log('⏱️ 游戏计时开始，开始时间:', new Date(this.game.gameStartTime).toLocaleTimeString());

                if (this.game.resumeGameTimer) {
                    this.game.resumeGameTimer();
                }
            }

            // 2. 恢复时间触发器
            this.resumeTimedTriggers();

            // 3. 先隐藏弹窗，恢复界面
            this.hideCurrentDialog();

            // 4. 确保游戏界面可见
            document.body.style.overflow = 'auto';

            // 5. 强制重新渲染所有乘客
            setTimeout(() => {
                if (this.game) {
                    console.log('🔄 强制重新渲染所有乘客');

                    // 重新渲染等候区的乘客
                    this.game.renderWaitingPassengers();

                    // 重新渲染已放置的乘客
                    this.game.passengers.forEach(passenger => {
                        if (passenger.placed && passenger.seatId) {
                            const seat = this.game.seats.find(s => s.id === passenger.seatId);
                            if (seat) {
                                this.game.addPassengerToSeat(passenger, seat);
                            }
                        }
                    });

                    // 更新UI
                    this.game.updateUI();
                }
            }, 500);

            // 6. 延迟触发故事对话
            setTimeout(() => {
                console.log('🎭 延迟触发游戏开始故事对话');

                // 查找游戏开始的故事对话
                const gameStartStoryDialogs = this.dialogs.filter(dialog => {
                    const isStory = dialog.content_type === 'story' || dialog.id >= 100;
                    const isGameStart = dialog.trigger_type === 'game_start' ||
                        (dialog.left_character && dialog.right_character);
                    return isStory && isGameStart;
                });

                console.log(`找到 ${gameStartStoryDialogs.length} 个游戏开始故事对话`);

                if (gameStartStoryDialogs.length > 0) {
                    gameStartStoryDialogs.sort((a, b) => a.id - b.id);
                    const firstStoryDialog = gameStartStoryDialogs[0];
                    console.log(`🎭 触发故事对话 ID=${firstStoryDialog.id}`);
                    this.triggerDialog(firstStoryDialog);
                }
            }, 800);
        }
    }



    /**
     * 更新当前弹窗内容
     */
    updateCurrentDialogContent(nextDialog) {
        const dialogContainer = document.querySelector('.dialog-container');
        if (!dialogContainer) return;

        console.log('平滑更新弹窗内容到:', nextDialog.dialog_text);
        dialogContainer.classList.add('updating');

        // 更新角色名称
        const nameSection = dialogContainer.querySelector('.dialog-character-name');
        if (nameSection) {
            nameSection.textContent = nextDialog.character_name || '系统提示';
        }

        // 更新对话内容
        const content = dialogContainer.querySelector('.dialog-content');
        if (content) {
            content.textContent = nextDialog.dialog_text;
        }

        // 播放音效
        if (nextDialog.sound) {
            this.playSound(nextDialog.sound);
        }

        setTimeout(() => {
            dialogContainer.classList.remove('updating');
        }, 300);
    }

    /**
     * 隐藏当前对话
     */
    hideCurrentDialog() {
        console.log('隐藏当前弹窗');

        const overlay = document.querySelector('.dialog-overlay');
        if (overlay) {
            overlay.classList.add('fade-out');
            setTimeout(() => {
                if (overlay.parentNode) overlay.remove();
            }, 300);
        }

        // 清除所有计时器
        this.timers.forEach((timer, key) => clearTimeout(timer));
        this.timers.clear();

        this.isDialogActive = false;
        this.activeDialog = null;
        this.dialogQueue = [];
    }

    /**
     * 跳过当前对话
     */
    skipDialog() {
        if (!this.isDialogActive) return;

        this.skipRequested = true;

        // 如果当前有下一个对话，跳过整个链
        if (this.activeDialog && this.activeDialog.next_dialog_id > 0) {
            let lastDialog = this.activeDialog;
            while (lastDialog.next_dialog_id > 0) {
                const nextDialog = this.dialogs.find(d => d.id === lastDialog.next_dialog_id);
                if (nextDialog) {
                    lastDialog = nextDialog;
                } else {
                    break;
                }
            }

            // 标记整个链为已触发
            let currentId = this.activeDialog.id;
            while (currentId > 0) {
                this.triggeredDialogs.add(currentId);
                const currentDialog = this.dialogs.find(d => d.id === currentId);
                currentId = currentDialog ? currentDialog.next_dialog_id : 0;
            }
        }

        this.hideCurrentDialog();

        // ===== 新增：跳过时也要恢复游戏状态 =====
        console.log('🎬 跳过系统提示，恢复游戏界面');

        // 1. 恢复游戏计时
        if (this.game) {
            // 重置游戏开始时间为现在
            this.game.gameStartTime = Date.now();
            this.game.elapsedSeconds = 0;

            console.log('⏱️ 游戏计时开始，开始时间:', new Date(this.game.gameStartTime).toLocaleTimeString());

            if (this.game.resumeGameTimer) {
                this.game.resumeGameTimer();
            }
        }

        // 2. 恢复时间触发器
        this.resumeTimedTriggers();

        // 3. 确保游戏界面可见
        document.body.style.overflow = 'auto';

        // 4. 强制重新渲染所有乘客
        setTimeout(() => {
            if (this.game) {
                console.log('🔄 强制重新渲染所有乘客');
                this.game.renderWaitingPassengers();

                this.game.passengers.forEach(passenger => {
                    if (passenger.placed && passenger.seatId) {
                        const seat = this.game.seats.find(s => s.id === passenger.seatId);
                        if (seat) {
                            this.game.addPassengerToSeat(passenger, seat);
                        }
                    }
                });

                this.game.updateUI();
            }
        }, 500);

        // 5. 延迟触发故事对话
        setTimeout(() => {
            console.log('🎭 延迟触发游戏开始故事对话');

            // 查找游戏开始的故事对话
            const gameStartStoryDialogs = this.dialogs.filter(dialog => {
                const isStory = dialog.content_type === 'story' || dialog.id >= 100;
                const isGameStart = dialog.trigger_type === 'game_start' ||
                    (dialog.left_character && dialog.right_character);
                return isStory && isGameStart;
            });

            console.log(`找到 ${gameStartStoryDialogs.length} 个游戏开始故事对话`);

            if (gameStartStoryDialogs.length > 0) {
                gameStartStoryDialogs.sort((a, b) => a.id - b.id);
                const firstStoryDialog = gameStartStoryDialogs[0];
                console.log(`🎭 触发故事对话 ID=${firstStoryDialog.id}`);
                this.triggerDialog(firstStoryDialog);
            }
        }, 800);

        this.processDialogQueue();
    }

    /**
     * 处理对话队列
     */
    processDialogQueue() {
        if (this.dialogQueue.length > 0 && !this.isDialogActive) {
            const nextDialog = this.dialogQueue.shift();
            setTimeout(() => this.triggerDialog(nextDialog), 500);
        }
    }

    /*****************************************************************
     * 气泡对话相关方法
     *****************************************************************/


    /**
     * ✅ 修复后的 showBubbleDialog
     */
    /**
     * 显示气泡对话
     */
    showBubbleDialog(dialog, targetElement = null, passenger = null) {
        if (!dialog || !dialog.dialog_text) return;

        const instanceId = `bubble_${dialog.id}_${Date.now()}`;
        console.log(`🎭 显示气泡对话: "${dialog.dialog_text}" (ID: ${dialog.id}, 实例: ${instanceId})`);

        // 确定挂载点 - 关键修复
        let mountTarget = null;

        if (passenger) {
            // 如果乘客在座位上，优先使用座位上的元素
            if (passenger.placed && passenger.seatId) {
                mountTarget = document.querySelector(`.passenger-on-seat[data-passenger-id="${passenger.id}"]`);
                console.log(`  尝试使用座位上的乘客元素: ${mountTarget ? '找到' : '未找到'}`);
            }

            // 如果没有找到座位上的元素，才使用等候区元素
            if (!mountTarget) {
                mountTarget = passenger.element;
                console.log(`  使用等候区乘客元素`);
            }
        } else if (targetElement) {
            mountTarget = targetElement;
        }

        if (!mountTarget) {
            console.warn("⚠️ 找不到气泡挂载目标");
            return;
        }

        // 确保目标元素可见且可以容纳子元素
        mountTarget.style.position = 'relative';
        mountTarget.style.overflow = 'visible';

        // 移除之前的所有气泡（避免重叠）
        const existingBubbles = mountTarget.querySelectorAll('.dialog-bubble');
        existingBubbles.forEach(bubble => {
            if (bubble.id && this.timers.has(bubble.id)) {
                clearTimeout(this.timers.get(bubble.id));
                this.timers.delete(bubble.id);
            }
            bubble.remove();
        });

        // 创建气泡元素
        const bubble = document.createElement('div');
        bubble.id = instanceId;
        bubble.dataset.dialogId = dialog.id;

        if (dialog.trigger_type === 'condition_specific') {
            bubble.className = 'dialog-bubble condition-bubble';
        } else {
            bubble.className = 'dialog-bubble';
        }

        if (dialog.character_emotion) {
            bubble.setAttribute('data-emotion', dialog.character_emotion);
        }

        bubble.style.zIndex = "10000";
        bubble.style.position = 'absolute';
        bubble.style.bottom = 'calc(100% + 10px)';
        bubble.style.left = '50%';
        bubble.style.transform = 'translateX(-50%)';
        bubble.innerHTML = `<span class="bubble-text">${dialog.dialog_text}</span>`;

        mountTarget.appendChild(bubble);

        // 设置自动隐藏计时器
        const showTime = (parseFloat(dialog.show_time) || 3) * 1000;
        console.log(`   自动隐藏时间: ${showTime}ms`);

        if (this.timers.has(instanceId)) {
            clearTimeout(this.timers.get(instanceId));
            this.timers.delete(instanceId);
        }

        const timer = setTimeout(() => {
            console.log(`⏰ 计时器触发，准备移除气泡: ${instanceId}`);
            this.removeBubbleInstance(instanceId);
        }, showTime);

        this.timers.set(instanceId, timer);
        console.log(`✅ 气泡已成功挂载到 ${mountTarget.className}，将在 ${showTime}ms 后自动移除`);

        // 验证
        setTimeout(() => {
            const bubbleStillExists = document.getElementById(instanceId);
            console.log(`🔍 气泡状态检查 (100ms后): ${bubbleStillExists ? '✅ 还在' : '❌ 已消失'}`);
        }, 100);
    }


    /**
     * 移除气泡实例
     */
    removeBubbleInstance(instanceId) {
        const bubble = document.getElementById(instanceId);
        if (bubble) {
            bubble.classList.add('fade-out');
            setTimeout(() => {
                if (bubble.parentNode) {
                    bubble.parentNode.removeChild(bubble);
                    console.log(`🗑️ 气泡实例已移除: ${instanceId}`);
                }
            }, 300);
        }

        // 清理对应的计时器
        if (this.timers.has(instanceId)) {
            clearTimeout(this.timers.get(instanceId));
            this.timers.delete(instanceId);
        }
    }

    /**
     * 隐藏气泡
     */
    hideBubble(dialogId) {
        const bubbleData = this.bubbles.get(dialogId);
        if (bubbleData) {
            const bubble = bubbleData.element;
            console.log(`隐藏气泡 ID: ${dialogId}`);

            bubble.classList.add('fade-out');

            setTimeout(() => {
                if (bubble.parentNode) bubble.remove();
                this.bubbles.delete(dialogId);
                console.log(`气泡已移除 ID: ${dialogId}`);
            }, 300);
        }

        // 清除计时器
        const timerKey = `bubble_${dialogId}`;
        if (this.timers.has(timerKey)) {
            clearTimeout(this.timers.get(timerKey));
            this.timers.delete(timerKey);
        }
    }

    /*****************************************************************
     * 其他对话类型方法
     *****************************************************************/

    /**
     * 显示工具提示
     */
    showTooltipDialog(dialog, targetElement) {
        if (!targetElement) {
            console.warn('无法显示工具提示：没有目标元素');
            return;
        }

        const tooltip = document.createElement('div');
        tooltip.className = 'dialog-tooltip';
        tooltip.textContent = dialog.dialog_text;

        targetElement.appendChild(tooltip);

        this.tooltips.set(dialog.id, { element: tooltip, target: targetElement });

        setTimeout(() => this.hideTooltip(dialog.id), 2000);
    }

    /**
     * 隐藏工具提示
     */
    hideTooltip(dialogId) {
        const tooltipData = this.tooltips.get(dialogId);
        if (tooltipData) {
            const tooltip = tooltipData.element;
            tooltip.classList.add('fade-out');
            setTimeout(() => {
                if (tooltip.parentNode) tooltip.remove();
                this.tooltips.delete(dialogId);
            }, 300);
        }
    }

    /**
     * 显示Guide提示
     */
    showGuideDialog(dialog) {
        console.log(`💡 显示Guide提示: "${dialog.dialog_text}"`);

        const overlay = document.getElementById('guide-overlay');
        const container = document.getElementById('guide-container');
        const text = document.getElementById('guide-text');
        const closeBtn = document.getElementById('guide-close-btn');

        if (!overlay || !container || !text) {
            console.error('❌ Guide提示DOM元素未找到');
            return;
        }

        // 设置提示内容
        text.textContent = dialog.dialog_text;

        // 设置位置
        container.className = 'guide-container';
        if (dialog.position && dialog.position.trim() !== '') {
            container.classList.add(dialog.position);
        } else {
            container.classList.add('top-center');
        }

        // 显示提示
        overlay.style.display = 'block';

        // 关闭按钮事件
        const closeHandler = (e) => {
            if (e) e.stopPropagation();
            console.log('✅ 关闭Guide提示');
            overlay.style.display = 'none';
            if (closeBtn) closeBtn.removeEventListener('click', closeHandler);
            container.removeEventListener('click', containerClickHandler);
        };

        // 容器点击关闭
        const containerClickHandler = (e) => {
            if (e.target === container || e.target.closest('.guide-text')) {
                closeHandler(e);
            }
        };

        if (closeBtn) closeBtn.addEventListener('click', closeHandler);
        container.addEventListener('click', containerClickHandler);

        // 自动关闭
        const duration = dialog.duration > 0 ? dialog.duration : (dialog.show_time > 0 ? dialog.show_time * 1000 : 5000);
        if (duration > 0) {
            console.log(`⏰ Guide提示将在 ${duration}ms后自动关闭`);
            setTimeout(() => {
                if (overlay.style.display === 'block') closeHandler();
            }, duration);
        }
    }

    /*****************************************************************
     * 游戏事件触发方法
     *****************************************************************/

    /**
     * 开始游戏对话 - 完全基于CSV配置，不写死任何内容
     */
    startGameDialogs() {
        console.log('🔧 开始游戏对话...');

        if (this.gameStartDialogsStarted) {
            console.log('⚠️ 游戏开始对话已经启动过，跳过');
            return;
        }

        this.gameStartDialogsStarted = true;

        try {
            // 1. 获取所有游戏开始的对话，按ID排序
            const allGameStartDialogs = this.dialogs
                .filter(dialog => dialog.trigger_type === 'game_start')
                .sort((a, b) => a.id - b.id);

            if (allGameStartDialogs.length === 0) {
                console.error('❌ 没有找到任何游戏开始对话');
                return;
            }

            console.log(`✅ 找到 ${allGameStartDialogs.length} 条游戏开始对话`);

            // 2. 按内容类型分组处理
            const narrativeDialogs = allGameStartDialogs.filter(d => d.content_type === 'narrative');
            const storyDialogs = allGameStartDialogs.filter(d => d.content_type === 'story');

            // 3. 先显示叙事对话（系统提示）
            if (narrativeDialogs.length > 0) {
                console.log('📢 显示叙事对话');
                const firstNarrative = narrativeDialogs[0];
                this.triggeredDialogs.add(firstNarrative.id);
                this.showNarrativeDialog(firstNarrative);
            }

            // 4. 延迟显示故事对话（郭嘉贾诩等）
            // ✅ 修改：移除这里的 setTimeout，改为在 BusSeatGame.js 的计时器中触发
            // 这样可以确保系统弹窗暂停时，故事对话不会跑出来
            if (storyDialogs.length > 0) {
                console.log(`🎭 故事对话已准备就绪，将在游戏时间2秒时触发`);
            }
        } catch (error) {
            console.error('❌ 启动游戏对话失败:', error);
        }
    }

    /**
     * 触发乘客放置对话 - 完整修复版
     */
    triggerPassengerPlacedDialog(passenger, seat) {
        console.log(`📢 ======== 触发乘客放置对话 ========`);
        console.log(`乘客: ${passenger.name}, 座位: ${seat.id}, 类型: ${seat.type}`);

        // 检查乘客是否满意
        const isSatisfied = this.game.checkPassengerSatisfaction(passenger);
        const condition = isSatisfied ? 'satisfied' : 'unsatisfied';

        console.log(`满意度: ${isSatisfied} (${condition})`);

        // ✅ 关键修复：先检查条件特定对话（靠窗、同伴等）
        this.checkAndTriggerConditionDialogs(passenger, seat, isSatisfied);

        // ✅ 然后检查乘客特定对话
        this.checkAndTriggerPassengerSpecificDialogs(passenger, seat, isSatisfied);

        // ✅ 最后使用通用对话作为后备
        this.triggerGenericDialogs(passenger, seat, condition);
    }

    /**
     * 检查并触发条件特定对话
     */
    checkAndTriggerConditionDialogs(passenger, seat, isSatisfied) {
        console.log(`🔍 检查 ${passenger.name} 的条件特定对话...`);

        // 查找这个乘客的所有条件对话
        const conditionDialogs = this.dialogs.filter(dialog =>
            dialog.trigger_type === 'condition_specific' &&
            dialog.condition_passenger &&
            dialog.condition_passenger.toLowerCase() === passenger.name.toLowerCase()
        );

        if (conditionDialogs.length === 0) {
            console.log(`  没有条件特定对话`);
            return;
        }

        console.log(`  找到条件对话: ${conditionDialogs.length} 条`);

        // 检查每个条件
        conditionDialogs.forEach(dialog => {
            const condition = dialog.trigger_condition;
            console.log(`  检查条件: ${condition}`);

            let shouldTrigger = false;

            switch (condition) {
                case 'window_seat':
                    shouldTrigger = seat.isWindow === true;
                    break;

                case 'near_eating':
                    shouldTrigger = this.checkEatingPassengerNearby(seat);
                    break;

                case 'paired_together':
                    if (passenger.pairedWith) {
                        const pairedPassenger = this.game.passengers.find(p => p.id === passenger.pairedWith);
                        if (pairedPassenger && pairedPassenger.placed && pairedPassenger.seatId) {
                            shouldTrigger = this.game.checkIfAdjacentSeats(passenger.seatId, pairedPassenger.seatId);
                        }
                    }
                    break;

                case 'timer':
                    // 定时触发，由其他地方处理
                    break;
            }

            if (shouldTrigger) {
                console.log(`✅ 条件满足: ${condition}，触发对话: "${dialog.dialog_text}"`);

                // 创建唯一键防止重复触发
                const conditionKey = `passenger_${passenger.id}_condition_${condition}_${dialog.id}`;

                if (!this.triggeredDialogs.has(conditionKey)) {
                    this.triggeredDialogs.add(conditionKey);

                    // 如果乘客不满意，可能需要调整情绪图标
                    const finalDialog = { ...dialog };
                    if (!isSatisfied && passenger.angryIcon) {
                        finalDialog.icon = passenger.angryIcon;
                        finalDialog.character_emotion = 'angry';
                    }

                    this.triggerDialog(finalDialog, null, passenger);
                }
            }
        });
    }

    /**
     * 检查并触发乘客特定对话
     */
    checkAndTriggerPassengerSpecificDialogs(passenger, seat, isSatisfied) {
        console.log(`🔍 检查 ${passenger.name} 的特定对话...`);

        // 查找乘客特定对话
        const passengerSpecificDialogs = this.dialogs.filter(dialog =>
            dialog.trigger_type === 'seat_assigned' &&
            dialog.trigger_target === 'seat' &&
            dialog.condition_passenger &&
            dialog.condition_passenger.toLowerCase() === passenger.name.toLowerCase()
        );

        if (passengerSpecificDialogs.length === 0) {
            console.log(`  没有乘客特定对话`);
            return;
        }

        console.log(`  找到乘客特定对话: ${passengerSpecificDialogs.length} 条`);

        // 根据满意度选择合适的对话
        let dialogToShow = null;

        // 优先选择情绪匹配的对话
        const emotionMatchDialogs = passengerSpecificDialogs.filter(d =>
            d.character_emotion === (isSatisfied ? 'happy' : 'angry')
        );

        if (emotionMatchDialogs.length > 0) {
            // 选择优先级最高的
            emotionMatchDialogs.sort((a, b) => a.priority - b.priority);
            dialogToShow = emotionMatchDialogs[0];
            console.log(`  选择了情绪匹配对话: ID=${dialogToShow.id}`);
        } else {
            // 选择第一个对话
            passengerSpecificDialogs.sort((a, b) => a.priority - b.priority);
            dialogToShow = passengerSpecificDialogs[0];
            console.log(`  选择了第一个可用对话: ID=${dialogToShow.id}`);
        }

        if (dialogToShow) {
            const dialogKey = `passenger_${passenger.id}_specific_${dialogToShow.id}`;

            if (!this.triggeredDialogs.has(dialogKey)) {
                this.triggeredDialogs.add(dialogKey);

                const finalDialog = { ...dialogToShow };
                if (!isSatisfied && passenger.angryIcon) {
                    finalDialog.icon = passenger.angryIcon;
                    finalDialog.character_emotion = 'angry';
                }

                console.log(`✅ 触发乘客特定对话: "${finalDialog.dialog_text}"`);
                this.triggerDialog(finalDialog, null, passenger);
            }
        }
    }

    /**
     * 触发通用对话作为后备
     */
    triggerGenericDialogs(passenger, seat, condition) {
        console.log(`🔄 检查通用${condition}对话...`);

        // 查找通用对话
        const generalDialogs = this.dialogs.filter(dialog =>
            dialog.trigger_type === 'seat_assigned' &&
            dialog.trigger_target === 'seat' &&
            dialog.trigger_condition === condition &&
            (!dialog.condition_passenger || dialog.condition_passenger.trim() === '')
        );

        if (generalDialogs.length === 0) {
            console.warn(`❌ 没有找到通用${condition}对话`);
            return;
        }

        generalDialogs.sort((a, b) => a.priority - b.priority);
        const generalDialog = generalDialogs[0];

        const generalKey = `passenger_${passenger.id}_general_${condition}`;

        if (!this.triggeredDialogs.has(generalKey)) {
            this.triggeredDialogs.add(generalKey);
            console.log(`💬 触发通用${condition}对话: "${generalDialog.dialog_text}"`);
            this.triggerDialog(generalDialog, null, passenger);
        }
    }



    /**
     * 为乘客触发条件对话
     */
    triggerConditionDialogsForPassenger(passenger, seat) {
        console.log(`🔍 检查 ${passenger.name} 的条件对话，座位ID: ${seat.id}`);

        // 1. 查找该乘客的所有条件对话
        const passengerConditionDialogs = this.dialogs.filter(dialog =>
            dialog.trigger_type === 'condition_specific' &&
            dialog.condition_passenger &&
            dialog.condition_passenger.toLowerCase() === passenger.name.toLowerCase()
        );

        console.log(`   找到 ${passengerConditionDialogs.length} 个条件对话`);

        passengerConditionDialogs.forEach(dialog => {
            const condition = dialog.trigger_condition;
            let shouldTrigger = false;

            console.log(`   检查条件: ${condition}`);

            switch (condition) {
                case 'window_seat':
                    // 检查是否靠窗
                    shouldTrigger = seat.isWindow === true;
                    console.log(`     ${passenger.name} 靠窗座位: ${shouldTrigger}`);
                    break;

                case 'near_eating':
                    // 检查附近是否有吃东西的乘客
                    shouldTrigger = this.checkEatingPassengerNearby ?
                        this.checkEatingPassengerNearby(seat) : false;
                    console.log(`     ${passenger.name} 附近有吃东西的: ${shouldTrigger}`);
                    break;

                case 'paired_together':
                    // 检查是否与同伴相邻
                    if (passenger.pairedWith) {
                        const pairedPassenger = this.game.passengers.find(p => p.id === passenger.pairedWith);
                        if (pairedPassenger && pairedPassenger.placed && pairedPassenger.seatId) {
                            const isAdjacent = this.game.checkIfAdjacentSeats ?
                                this.game.checkIfAdjacentSeats(passenger.seatId, pairedPassenger.seatId) : false;
                            shouldTrigger = isAdjacent;
                            console.log(`     ${passenger.name} 与同伴相邻: ${shouldTrigger}`);
                        } else {
                            console.log(`     ${passenger.name} 的同伴未就座`);
                        }
                    }
                    break;

                case 'timer':
                    // 定时触发
                    const gameTime = Math.floor((Date.now() - this.gameStartTime) / 1000);
                    const targetTime = dialog.condition_game_time || 0;
                    shouldTrigger = gameTime >= targetTime && gameTime < targetTime + 2;
                    console.log(`     ${passenger.name} 定时检查: 当前${gameTime}秒, 目标${targetTime}秒`);
                    break;
            }

            if (shouldTrigger) {
                console.log(`✅ 触发 ${passenger.name} 的条件对话: "${dialog.dialog_text}"`);

                // 使用唯一键避免重复触发
                const conditionKey = `condition_${passenger.id}_${condition}_${dialog.id}`;
                if (!this.triggeredDialogs.has(conditionKey)) {
                    this.triggerDialog(dialog, null, passenger);
                    this.triggeredDialogs.add(conditionKey);
                } else {
                    console.log(`  此条件对话已触发过: ${conditionKey}`);
                }
            }
        });
    }



    /*****************************************************************
     * 辅助方法
     *****************************************************************/

    /**
     * 查找目标元素
     */
    findTargetElement(dialog, passenger) {
        switch (dialog.trigger_target) {
            case 'seat':
                if (passenger && passenger.seatId) {
                    return document.querySelector(`[data-seat-id="${passenger.seatId}"]`);
                }
                return null;

            case 'waiting_area':
                if (passenger && passenger.element) {
                    return passenger.element;
                }
                return document.getElementById('waiting-area');

            case 'passenger':
                if (passenger && passenger.element) {
                    return passenger.element;
                }
                return document.querySelector('.waiting-passenger');

            case 'global':
            default:
                return document.body;
        }
    }

    /**
     * 播放音效
     */
    playSound(soundPath) {
        try {
            const audio = new Audio(soundPath);
            audio.volume = 0.3;
            audio.play().catch(e => console.warn('音效播放失败:', e));
        } catch (error) {
            console.warn('无法播放音效:', error);
        }
    }

    /**
     * 添加CSS动画
     */
    addDialogAnimations() {
        if (!document.querySelector('#dialog-animations')) {
            const style = document.createElement('style');
            style.id = 'dialog-animations';
            style.textContent = `
                .dialog-overlay {
                    animation: dialogFadeIn 0.3s ease;
                }
                .dialog-overlay.fade-out {
                    animation: dialogFadeOut 0.3s ease;
                }
                .dialog-container {
                    animation: dialogSlideUp 0.5s ease;
                }
                .dialog-bubble {
                    animation: bubbleAppear 0.3s ease;
                }
                .dialog-bubble.fade-out {
                    animation: bubbleDisappear 0.3s ease;
                }
                .dialog-tooltip {
                    animation: tooltipFadeIn 0.2s ease;
                }
                .dialog-tooltip.fade-out {
                    animation: tooltipFadeOut 0.2s ease;
                }
                @keyframes dialogFadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes dialogFadeOut { from { opacity: 1; } to { opacity: 0; } }
                @keyframes dialogSlideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes bubbleAppear { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes bubbleDisappear { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-10px); } }
                @keyframes tooltipFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes tooltipFadeOut { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-5px); } }
           
                /* 添加弹窗内容更新动画 */
                .dialog-container.updating .dialog-content {
                    animation: contentUpdate 0.3s ease;
                }

                .dialog-container.updating .dialog-character-name {
                    animation: nameUpdate 0.3s ease;
                }

                @keyframes contentUpdate {
                    0% { opacity: 0.5; transform: translateY(10px); }
                    100% { opacity: 1; transform: translateY(0); }
                }

                @keyframes nameUpdate {
                    0% { opacity: 0.5; transform: scale(0.95); }
                    100% { opacity: 1; transform: scale(1); }
                }

                /* 添加平滑过渡 */
                .dialog-content {
                    transition: all 0.3s ease;
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * 清理所有对话
     */
    cleanup() {
        // 隐藏所有气泡
        this.bubbles.forEach((bubble, id) => this.hideBubble(id));

        // 隐藏所有工具提示
        this.tooltips.forEach((tooltip, id) => this.hideTooltip(id));

        // 隐藏强制对话
        this.hideCurrentDialog();

        // 隐藏故事对话
        this.hideStoryDialog();

        // 清空队列
        this.dialogQueue = [];

        // 清除所有计时器
        this.timers.forEach((timer, key) => clearTimeout(timer));
        this.timers.clear();

        // 重置状态
        this.isDialogActive = false;
        this.skipRequested = false;
    }

    /**
     * 重置对话系统
     */
    reset() {
        this.cleanup();
        this.triggeredDialogs.clear();
        this.seatAssignments.clear();
        this.gameStartTime = Date.now();
        this.carStarted = false;
        this.dialogQueue = [];
    }

    /**
     * 开始定时检查
     */
    startTimedChecks() {
        setInterval(() => {
            if (!this.game.isPaused) this.checkTimedTriggers();
        }, 30000);
    }


    /**
     * 检查定时触发
     */
    checkTimedTriggers() {
        // ✅ 如果时间触发器被暂停，直接返回
        if (this.timedTriggersPaused) {
            console.log('⏸️ 时间触发器暂停中，跳过检查');
            return;
        }

        const gameTime = Math.floor((Date.now() - this.gameStartTime) / 1000);

        // 触发定时条件对话
        if (gameTime >= 2 && gameTime < 3) {
            const chenDeng = this.game.passengers.find(p => p.name === "陈登");
            if (chenDeng) {
                this.conditionSystem.checkAndTriggerCondition('timer', {
                    passenger: chenDeng,
                    gameTime: 2
                });
            }
        }

        // 检查30秒触发
        if (gameTime >= 30 && gameTime < 32) {
            this.triggerConditionDialogs('timer_30s', 'global');
        }
    }


    /**
     * 获取乘客特定对话
     * @param {string} passengerName 乘客名称
     * @param {string} triggerType 触发类型
     * @param {string|null} condition 条件（可选）
     * @returns {Array} 匹配的对话数组
     */
    getPassengerSpecificDialogs(passengerName, triggerType, condition = null) {
        if (!passengerName || !triggerType) {
            console.warn('getPassengerSpecificDialogs: 缺少必要参数', { passengerName, triggerType });
            return [];
        }

        return this.dialogs.filter(dialog => {
            // 检查触发类型匹配
            const triggerMatch = dialog.trigger_type === triggerType;
            // 检查乘客名称匹配
            const passengerMatch = dialog.condition_passenger &&
                dialog.condition_passenger.toLowerCase() === passengerName.toLowerCase();
            // 检查条件匹配（如果有条件参数）
            const conditionMatch = !condition || dialog.trigger_condition === condition;

            return triggerMatch && passengerMatch && conditionMatch;
        });
    }

    /**
     * 获取条件特定对话
     * @param {string} passengerName 乘客名称
     * @param {string} condition 条件
     * @returns {Array} 匹配的对话数组
     */
    getConditionSpecificDialogs(passengerName, condition) {
        if (!passengerName || !condition) {
            console.warn('getConditionSpecificDialogs: 缺少必要参数', { passengerName, condition });
            return [];
        }

        return this.dialogs.filter(dialog => {
            // 检查触发类型
            const triggerMatch = dialog.trigger_type === 'condition_specific';
            // 检查内容类型
            const contentMatch = dialog.content_type === 'bubble';
            // 检查乘客名称
            const passengerMatch = dialog.condition_passenger &&
                dialog.condition_passenger.toLowerCase() === passengerName.toLowerCase();
            // 检查条件
            const conditionMatch = dialog.trigger_condition === condition;

            return triggerMatch && contentMatch && passengerMatch && conditionMatch;
        });
    }

    /**
     * 获取通用类型对话
     * @param {string} triggerType 触发类型
     * @param {string} target 目标
     * @param {string} condition 条件
     * @returns {Array} 匹配的对话数组
     */
    getGeneralDialogs(triggerType, target, condition) {
        return this.dialogs.filter(dialog =>
            dialog.trigger_type === triggerType &&
            dialog.trigger_target === target &&
            dialog.trigger_condition === condition &&
            (!dialog.condition_passenger || dialog.condition_passenger.trim() === '')
        );
    }

    /**
     * 调试：查找乘客的所有对话
     * @param {string} passengerName 乘客名称
     */
    debugPassengerDialogs(passengerName) {
        console.group(`🔍 ${passengerName} 的所有对话`);

        // 查找条件特定对话
        const conditionDialogs = this.dialogs.filter(dialog =>
            dialog.trigger_type === 'condition_specific' &&
            dialog.condition_passenger &&
            dialog.condition_passenger.toLowerCase() === passengerName.toLowerCase()
        );

        console.log(`条件特定对话: ${conditionDialogs.length} 条`);
        conditionDialogs.forEach(dialog => {
            console.log(`  ID=${dialog.id}: "${dialog.dialog_text}" (条件: ${dialog.trigger_condition})`);
        });

        // 查找乘客特定放置对话
        const placementDialogs = this.dialogs.filter(dialog =>
            dialog.trigger_type === 'seat_assigned' &&
            dialog.trigger_target === 'seat' &&
            dialog.condition_passenger &&
            dialog.condition_passenger.toLowerCase() === passengerName.toLowerCase()
        );

        console.log(`放置对话: ${placementDialogs.length} 条`);
        placementDialogs.forEach(dialog => {
            console.log(`  ID=${dialog.id}: "${dialog.dialog_text}" (条件: ${dialog.trigger_condition})`);
        });

        console.groupEnd();
    }


    /**
     * 检查特殊条件
     */
    checkSpecialConditions(passenger, seat) {
        // 检查是否有吃东西的乘客在附近
        if (this.checkEatingPassengerNearby(seat)) {
            this.triggerConditionDialogs('eating_passenger_nearby', 'seat');
        }

        // 检查同伴是否已就座
        if (passenger.pairedWith) {
            const pairedPassenger = this.game.passengers.find(p => p.id === passenger.pairedWith);
            if (pairedPassenger && !pairedPassenger.placed) {
                this.triggerWaitingAreaDialog(pairedPassenger, 'paired_passenger_seated');
            }
        }
    }

    /**
     * 检查附近是否有吃东西的乘客
     */
    checkEatingPassengerNearby(seat) {
        if (!this.game || !this.game.getAdjacentSeatIds) return false;

        const adjacentSeatIds = this.game.getAdjacentSeatIds(seat.id);

        for (const adjSeatId of adjacentSeatIds) {
            const adjSeat = this.game.seats.find(s => s.id === adjSeatId);
            if (adjSeat && adjSeat.occupied) {
                const adjPassenger = this.game.passengers.find(p => p.id === adjSeat.passengerId);
                if (adjPassenger && adjPassenger.preferences &&
                    adjPassenger.preferences.includes("吃东西")) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * 触发等待区对话
     */
    triggerWaitingAreaDialog(passenger, condition) {
        const dialogs = this.getDialogsByTrigger('waiting_area', 'waiting_area', condition);
        dialogs.forEach(dialog => {
            if (!this.triggeredDialogs.has(dialog.id)) {
                this.triggerDialog(dialog, null, passenger);
            }
        });
    }

    /**
     * 触发条件对话
     */
    triggerConditionDialogs(condition, target = 'global') {
        const dialogs = this.getDialogsByTrigger('condition_met', target, condition);
        dialogs.forEach(dialog => {
            if (!this.triggeredDialogs.has(dialog.id)) {
                this.triggerDialog(dialog);
            }
        });
    }

    /**
     * 触发乘客悬停对话
     */
    triggerPassengerHoverDialog(passenger, element) {
        const dialogs = this.getDialogsByTrigger('passenger_hover', 'passenger', 'immediate');
        dialogs.forEach(dialog => {
            if (!this.triggeredDialogs.has(dialog.id)) {
                this.triggerDialog(dialog, element, passenger);
            }
        });
    }

    /**
     * 触发座位悬停对话
     */
    triggerSeatHoverDialog(seat, element) {
        const dialogs = this.getDialogsByTrigger('seat_hover', 'seat', 'immediate');
        dialogs.forEach(dialog => {
            if (!this.triggeredDialogs.has(dialog.id)) {
                this.triggerDialog(dialog, element);
            }
        });
    }

    /**
     * 触发所有乘客就座对话
     */
    triggerAllPassengersSeatedDialog() {
        this.triggerConditionDialogs('all_passengers_seated', 'global');
    }

    /**
     * 设置车已启动
     */
    setCarStarted() {
        this.carStarted = true;
    }

    /**
     * 检查车还没开的情况
     */
    checkCarNotStarted() {
        setTimeout(() => {
            if (this.game.placedCount < this.game.totalPassengers) {
                this.triggerConditionDialogs('car_not_started', 'global');
            }
        }, 60000);
    }

    /**
     * 触发座位悬停工具提示
     */
    triggerSeatHoverTooltip(seat) {
        const dialogs = this.getDialogsByTrigger('seat_hover', 'seat', 'immediate');
        dialogs.forEach(dialog => {
            if (!this.triggeredDialogs.has(dialog.id)) {
                this.triggerDialog(dialog, seat.element);
            }
        });
    }
}
// ✅ 添加一个简单的条件系统（如果ConditionDialogsSystem不存在）
if (typeof ConditionDialogsSystem === 'undefined') {
    console.log('🔧 创建简单条件对话系统');
    window.ConditionDialogsSystem = class ConditionDialogsSystem {
        constructor(dialogSystem) {
            this.dialogSystem = dialogSystem;
        }

        init() {
            console.log('✅ 简单条件系统初始化完成');
        }

        checkAndTriggerCondition(condition, data) {
            console.log(`🔍 检查条件: ${condition}`, data);

            const { passenger, seat } = data;

            // 查找对应的条件对话
            const conditionDialogs = this.dialogSystem.dialogs.filter(dialog =>
                dialog.trigger_type === 'condition_specific' &&
                dialog.condition_passenger === passenger.name.toLowerCase() &&
                dialog.trigger_condition === condition
            );

            if (conditionDialogs.length > 0) {
                console.log(`✅ 触发 ${passenger.name} 的 ${condition} 条件对话`);
                // 触发优先级最高的对话
                conditionDialogs.sort((a, b) => a.priority - b.priority);
                const dialogToShow = conditionDialogs[0];

                // 使用唯一键避免重复触发
                const conditionKey = `condition_${passenger.id}_${condition}`;
                if (!this.dialogSystem.triggeredDialogs.has(conditionKey)) {
                    this.dialogSystem.triggerDialog(dialogToShow, null, passenger);
                    this.dialogSystem.triggeredDialogs.add(conditionKey);
                }
            }
        }
    };
}

// 导出DialogSystem类到全局作用域
if (typeof window !== 'undefined') {
    window.DialogSystem = DialogSystem;
    console.log("✅ DialogSystem 已注册到全局");
}

// 同时保留Node.js导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DialogSystem;
}
