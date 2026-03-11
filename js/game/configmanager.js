/**
 * 配置管理器
 * 负责加载和管理游戏配置，包括乘客数据和座位数据
 */
class ConfigManager {
    constructor() {
        this.passengers = []; // 乘客数据
        this.seats = []; // 座位数据
        this.dialogs = []; // 对话数据
        this.loaded = false; // 配置是否已加载
    }

    /**
     * 加载所有配置
     * @returns {Promise<boolean>} 是否加载成功
     */
    async loadAllConfigs() {
        try {
            console.log('开始加载游戏配置...');

            // 并行加载所有配置
            await Promise.all([
                this.loadPassengersConfig(),
                this.loadSeatsConfig(),
                this.loadDialogsConfig()
            ]);

            this.loaded = true;
            console.log('游戏配置加载完成');
            console.log(`乘客: ${this.passengers.length}名`);
            console.log(`座位: ${this.seats.length}个`);
            console.log(`对话: ${this.dialogs.length}条`);

            return true;
        } catch (error) {
            console.error('配置加载失败:', error);
            // 加载默认配置
            this.loadDefaultConfigs();
            return false;
        }
    }

    /**
     * 加载乘客配置
     * @returns {Promise<void>}
     */
    async loadPassengersConfig() {
        console.log('🔧 开始加载乘客CSV配置...');

        // 使用测试成功的路径
        const csvPath = '../../assets/passengers.csv';
        console.log(`📁 使用路径: ${csvPath}`);

        try {
            const response = await fetch(csvPath);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const csvText = await response.text();
            console.log(`✅ CSV文件加载成功，大小: ${csvText.length} 字符`);

            // 解析CSV
            this.parsePassengersCSV(csvText);
            console.log(`✅ CSV解析完成，加载了 ${this.passengers.length} 名乘客`);

        } catch (error) {
            console.error('❌ CSV文件加载失败:', error);
            console.error('请确保文件路径正确');

            // 设置空数组
            this.passengers = [];
        }
    }

    /**
     * 解析乘客CSV数据
     * @param {string} csvText CSV文本
     */
    parsePassengersCSV(csvText) {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());

        this.passengers = [];

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;

            const values = this.parseCSVLine(lines[i]);
            const passenger = {};

            headers.forEach((header, index) => {
                passenger[header] = values[index] ? values[index].trim() : '';
            });


            // 转换数据类型
            passenger.id = parseInt(passenger.id);

            // ⚠️ 关键修复：正确处理空字符串
            if (passenger.pairedWith && passenger.pairedWith.trim() !== "") {
                passenger.pairedWith = parseInt(passenger.pairedWith);
            } else {
                passenger.pairedWith = null;
            }

            // 在 ConfigManager.js 中的 parsePassengersCSV 方法中
            // 修改这部分代码：
            // 处理preferences字段
            if (passenger.preferences && passenger.preferences.trim() !== "") {
                let prefStr = passenger.preferences.trim();

                // 移除可能的引号
                if (prefStr.startsWith('"') && prefStr.endsWith('"')) {
                    prefStr = prefStr.substring(1, prefStr.length - 1);
                }

                // ⚠️ 关键修改：使用分号分割多个需求
                passenger.preferences = prefStr.split(';').map(p => p.trim());
            } else {
                passenger.preferences = [];
            }

            // 设置默认值
            passenger.placed = false;
            passenger.seatId = null;
            passenger.element = null;
            passenger.satisfied = false;
            passenger.startX = 0;
            passenger.startY = 0;
            passenger.placedBeforeThisCall = false;
            passenger.currentIcon = passenger.icon || `assets/passengers/${passenger.name}.png`;
            passenger.isAngry = false;
            passenger.chatContent = passenger.chatContent || "";
            passenger.seatChatContent = passenger.seatChatContent || "";

            this.passengers.push(passenger);
        }
    }

    /**
     * 加载座位配置
     * @returns {Promise<void>}
     */
    async loadSeatsConfig() {
        // 从gameConfig.js中获取座位配置
        if (typeof gameConfig !== 'undefined') {
            this.seats = JSON.parse(JSON.stringify(gameConfig.seats));
            console.log('座位配置加载成功');

            // 为座位添加额外属性
            this.seats = this.seats.map(seat => ({
                ...seat,
                occupied: false,
                passengerId: null,
                element: null
            }));
        } else {
            // 如果没有配置，创建默认座位
            this.createDefaultSeats();
        }
    }

    /**
     * 创建默认座位
     */
    createDefaultSeats() {
        this.seats = [];

        // 创建16个座位（1-16）
        for (let i = 1; i <= 16; i++) {
            this.seats.push({
                id: i,
                type: 'seat',
                occupied: false,
                passengerId: null,
                element: null,
                isWindow: i <= 4 || i === 5 || i === 8 || i === 9 || i === 12 || i === 13 || i === 16 // 简化判断
            });
        }

        // 创建3个站位（17-19）
        for (let i = 17; i <= 19; i++) {
            this.seats.push({
                id: i,
                type: 'standing',
                occupied: false,
                passengerId: null,
                element: null,
                isWindow: false
            });
        }

        console.log('创建默认座位配置');
    }

    /**
     * 加载对话配置
     * @returns {Promise<void>}
     */
    async loadDialogsConfig() {
        try {
            const response = await fetch('../../assets/dialogs.csv');
            if (response.ok) {
                const csvText = await response.text();
                this.parseDialogsCSV(csvText);
                console.log('对话CSV配置加载成功');
                return;
            }
        } catch (error) {
            console.warn('对话CSV文件加载失败:', error);
        }

        // 如果CSV加载失败，使用默认对话
        this.dialogs = this.getDefaultDialogs();
    }

    /**
     * 解析对话CSV数据
     * @param {string} csvText CSV文本
     */
    parseDialogsCSV(csvText) {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());

        this.dialogs = [];

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;

            const values = this.parseCSVLine(lines[i]);
            const dialog = {};

            headers.forEach((header, index) => {
                dialog[header] = values[index] ? values[index].trim() : '';
            });

            // 转换基本数据类型
            dialog.id = parseInt(dialog.id);
            dialog.delay_time = parseFloat(dialog.delay_time);
            dialog.priority = parseInt(dialog.priority);
            dialog.show_time = parseFloat(dialog.show_time);
            dialog.next_dialog_id = dialog.next_dialog_id ? parseInt(dialog.next_dialog_id) : 0;
            dialog.auto_advance = dialog.auto_advance.toLowerCase() === 'true';

            // ==================== 【修正：双角色对话字段】 ====================
            // 显示时长（毫秒）- 处理可能为空的字段
            dialog.duration = dialog.duration && dialog.duration.trim() !== '' ?
                parseInt(dialog.duration) : 0;

            // 是否可跳过 - 处理可能为空的字段
            if (dialog.skipable && dialog.skipable.trim() !== '') {
                dialog.skipable = dialog.skipable.toLowerCase() === 'true';
            } else {
                dialog.skipable = true; // 默认值
            }

            // 显示位置 - 处理可能为空的字段
            dialog.position = dialog.position || 'bottom-center';

            // 左侧角色名 - 处理可能为空的字段
            dialog.left_character = dialog.left_character || '';

            // 右侧角色名 - 处理可能为空的字段
            dialog.right_character = dialog.right_character || '';

            // 当前说话的角色 - 处理可能为空的字段
            if (dialog.speaking_side && dialog.speaking_side.trim() !== '') {
                dialog.speaking_side = dialog.speaking_side.trim().toLowerCase();
            } else {
                dialog.speaking_side = 'left'; // 默认值
            }
            // ==================== 【修正结束】 ====================

            // ✅ 只添加一次！
            this.dialogs.push(dialog);

            // 🔽 删除以下重复代码（如果存在）：
            // dialog.duration = dialog.duration ? parseInt(dialog.duration) : 0;
            // ... 其他重复字段处理 ...
            // this.dialogs.push(dialog); // ❌ 删除这行！
        }

        // 添加调试输出
        console.log(`✅ 解析了 ${this.dialogs.length} 条对话`);
        this.logStoryDialogs(); // 添加调试函数
    }


    /**
     * 解析CSV行（处理引号和逗号）
     * @param {string} line CSV行
     * @returns {Array} 解析后的值数组
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
     * 获取默认对话
     * @returns {Array} 默认对话数组
     */
    getDefaultDialogs() {
        return [
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
     * 加载默认配置
     */
    loadDefaultConfigs() {
        console.log('加载默认配置...');

        // 加载默认乘客
        this.passengers = this.getDefaultPassengers();

        // 创建默认座位
        this.createDefaultSeats();

        // 加载默认对话
        this.dialogs = this.getDefaultDialogs();

        this.loaded = true;
        console.log('默认配置加载完成');
    }

    /**
     * 获取默认乘客数据
     * @returns {Array} 默认乘客数组
     */
    getDefaultPassengers() {
        console.warn('⚠️ 使用最小的默认乘客配置（CSV加载失败）');
        return [
            {
                id: 1,
                name: "乘客",
                preferences: ["无"],
                description: "请放置到座位",
                icon: "",
                angryIcon: "",
                pairedWith: null,
                chatContent: "测试对话",
                seatChatContent: "测试座位对话",
                placed: false,
                seatId: null,
                element: null,
                satisfied: false,
                startX: 0,
                startY: 0,
                placedBeforeThisCall: false,
                currentIcon: "",
                isAngry: false
            }
        ];
    }

    /**
     * 获取相邻座位关系
     * @param {number} seatId 座位ID
     * @returns {Array} 相邻座位ID数组
     */
    getAdjacentSeatIds(seatId) {
        // 根据实际座位布局定义相邻关系
        const adjacency = {
            1: [2],
            2: [1, 3],
            3: [2, 4],
            4: [3],
            5: [6], 6: [5],
            7: [8], 8: [7],
            9: [10], 10: [9],
            11: [12], 12: [11],
            13: [14], 14: [13],
            15: [16], 16: [15],
            17: [18], 18: [17, 19], 19: [18]
        };

        return adjacency[seatId] || [];
    }

    /**
     * 检查两个座位是否相邻
     * @param {number} seatId1 座位1ID
     * @param {number} seatId2 座位2ID
     * @returns {boolean} 是否相邻
     */
    checkIfAdjacentSeats(seatId1, seatId2) {
        const adjacentPairs = [
            [5, 6], [6, 5],
            [7, 8], [8, 7],
            [9, 10], [10, 9],
            [11, 12], [12, 11],
            [13, 14], [14, 13],
            [15, 16], [16, 15]
        ];

        return adjacentPairs.some(pair =>
            (pair[0] === seatId1 && pair[1] === seatId2) ||
            (pair[1] === seatId1 && pair[0] === seatId2)
        );
    }

    /**
     * 根据座位ID获取座位对象
     * @param {number} seatId 座位ID
     * @returns {Object|null} 座位对象或null
     */
    getSeatById(seatId) {
        return this.seats.find(seat => seat.id === seatId);
    }

    /**
     * 根据乘客ID获取乘客对象
     * @param {number} passengerId 乘客ID
     * @returns {Object|null} 乘客对象或null
     */
    getPassengerById(passengerId) {
        return this.passengers.find(passenger => passenger.id === passengerId);
    }


    // ✅ 在这里添加测试方法：
    /**
     * 测试CSV文件加载
     */
    testCSVPaths() {
        console.group('🧪 测试CSV文件路径');

        const testPaths = [
            '../../assets/passengers.csv',  // 从 js/game/
            '../assets/passengers.csv',     // 从 js/
            'assets/passengers.csv',        // 根目录
            './assets/passengers.csv',      // 当前目录
            '/assets/passengers.csv'        // 绝对路径
        ];

        testPaths.forEach(path => {
            console.log(`尝试: ${path}`);
            fetch(path)
                .then(r => console.log(`  状态: ${r.status} ${r.statusText}`))
                .catch(e => console.log(`  失败: ${e.message}`));
        });

        console.groupEnd();

    }
    /**
  * 调试函数：输出story类型对话的详细信息
  */
    logStoryDialogs() {
        const storyDialogs = this.dialogs.filter(d => d.content_type === 'story');
        console.group('📖 Story类型对话检查');
        console.log(`找到 ${storyDialogs.length} 条story类型对话`);

        storyDialogs.forEach((dialog, index) => {
            console.log(`#${index + 1} ID:${dialog.id} "${dialog.dialog_text.substring(0, 30)}..."`, {
                left: dialog.left_character,
                right: dialog.right_character,
                side: dialog.speaking_side,
                duration: dialog.duration,
                skipable: dialog.skipable
            });
        });

        console.groupEnd();
    }
}

// 导出ConfigManager类到全局作用域
if (typeof window !== 'undefined') {
    window.ConfigManager = ConfigManager;
    console.log("✅ ConfigManager 已注册到全局");
}

// 同时保留Node.js导出（可选）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConfigManager;
}

