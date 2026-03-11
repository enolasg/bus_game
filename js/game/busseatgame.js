/**
 * 公交车座位游戏主类
 * 管理游戏状态、乘客和座位交互逻辑
 */
class BusSeatGame {
    constructor() {
        // 游戏状态变量
        this.passengers = [];          // 所有乘客数组
        this.seats = [];               // 所有座位数组
        this.selectedPassenger = null; // 当前选中的乘客
        this.isDragging = false;       // 是否正在拖拽
        this.isPaused = false;         // 游戏是否暂停
        this.placedCount = 0;          // 已放置的乘客数量
        this.totalPassengers = 0;      // 总乘客数
        this.tooltipTimer = null;      // 需求卡隐藏计时器
        this.currentHoveredPassenger = null; // 当前悬停的乘客ID
        this.dragOffsetX = 0;          // 拖拽X偏移量
        this.dragOffsetY = 0;          // 拖拽Y偏移量
        this.followingPassenger = null; // 跟随鼠标的乘客元素
        this.lastShownPassenger = null; // 记录上次显示的乘客
        this.zIndexCounter = 1000;     // 层级计数器，用于动态分配层级值

        // ✅ 新增：对话系统活动状态（与 DialogSystem 同步）
        this.isDialogActive = false;
        // 新增属性
        this.satisfiedCount = 0;       // 满意乘客数量
        this.score = 0;                // 游戏得分
        this.chatBubbles = new Map();  // 聊天气泡存储
        this.chatTimers = new Map();   // 聊天计时器
        this.departButton = null;      // 发车按钮
        this.satisfactionDisplay = null; // 满意度显示元素引用

        // 新增：对话系统实例
        this.dialogSystem = null;
        // ✅ 新增：游戏计时相关属性
        this.gameStartTime = 0;        // 游戏实际开始时间（系统提示结束后）
        this.gameTimer = null;         // 游戏计时器
        this.isGameTimerPaused = true; // 游戏计时器是否暂停（初始为暂停）
        this.gameTimerInterval = null; // 计时器间隔ID
        this.elapsedSeconds = 0;       // 游戏进行时间（秒）

        // ✅ 新增：对话系统状态跟踪
        this.dialogSystemInitialized = false;
    }

    /**
     * 初始化游戏
     */
    init() {
        console.log('初始化公交车座位游戏...');

        // ✅ 初始化游戏计时状态（但保持暂停）
        this.initGameTimer();

        // 加载游戏配置
        this.loadGameConfig();

        // 设置事件监听器
        this.setupEventListeners();

        // 渲染等待区的乘客
        this.renderWaitingPassengers();

        // 更新UI显示
        this.updateUI();

        // 初始化跟随鼠标的乘客元素
        this.followingPassenger = document.getElementById('dragging-passenger');
        this.followingPassenger.style.display = 'none';

        // 先初始化满意度显示
        this.initSatisfactionDisplay();

        // 开始检查车还没开的情况
        this.checkCarNotStarted();

        // 初始化发车按钮
        this.initDepartButton();

        // ===== 新增：一次性固定 displayArea 的位置 =====
        setTimeout(() => {
            this.fixDisplayAreaPosition();
        }, 500);
        // ============================================

        // 延迟初始化座位，确保DOM加载完成
        setTimeout(() => {
            this.initSeats();

            console.log('✅ 座位初始化完成，准备初始化对话系统');
            // 初始化对话系统（稍晚一些，确保所有资源加载）
            setTimeout(async () => {
                await this.initDialogSystem();
                // 注意：这里不再二次启动对话，initDialogSystem() 内部已经启动了
            }, 300);

            console.log('游戏初始化完成');
        }, 100);

        // 确保公交车容器位置正确
        setTimeout(() => {
            const busContainer = document.querySelector('.bus-image-container');
            if (busContainer) {
                // 重置 transform，确保居中
                busContainer.style.transform = 'translate(-50%, -50%)';
            }
        }, 1000);
    }

    /**
     * 移除 fixDisplayAreaPosition 方法，或者让它为空
     */
    fixDisplayAreaPosition() {
        // 不再做任何操作，完全依赖 CSS
        console.log('✅ 使用 CSS 定位');
    }

    /**
     * 修复显示区域高度
     */
    fixDisplayAreaHeight() {
        const displayArea = document.getElementById('passenger-display');
        const busContainer = document.querySelector('.bus-image-container');

        if (!displayArea || !busContainer) {
            console.warn('找不到必要的元素');
            return;
        }

        // 获取公交车容器的位置和尺寸
        const busRect = busContainer.getBoundingClientRect();

        // 设置 displayArea 的位置和尺寸与公交车容器完全一致
        displayArea.style.position = 'absolute';
        displayArea.style.top = `${busRect.top}px`;
        displayArea.style.left = `${busRect.left}px`;
        displayArea.style.width = `${busRect.width}px`;
        displayArea.style.height = `${busRect.height}px`;

        console.log('🔄 固定 displayArea 位置:', {
            top: busRect.top,
            left: busRect.left,
            width: busRect.width,
            height: busRect.height
        });
    }


    /**
     * ✅ 初始化游戏计时器（保持暂停状态）
     */
    initGameTimer() {
        console.log('⏱️ 初始化游戏计时器（保持暂停）');
        this.gameStartTime = 0;
        this.elapsedSeconds = 0;
        this.isGameTimerPaused = true;

        // 不立即启动计时器，等待系统提示结束后启动
    }

    /**
     * 加载游戏配置
     */
    loadGameConfig() {
        console.log('加载游戏配置...');

        // ⚠️ 优先级1：首先尝试从ConfigManager获取CSV数据
        if (window.configManager && window.configManager.passengers && window.configManager.passengers.length > 0) {
            console.log('✅ 从ConfigManager获取CSV乘客数据');
            console.log(`  乘客数量: ${window.configManager.passengers.length}`);

            this.passengers = window.configManager.passengers.map(p => ({
                ...p,
                placed: false,      // 是否已放置
                seatId: null,       // 所在座位ID
                element: null,      // DOM元素引用
                satisfied: false,   // 是否满意
                startX: 0,         // 初始X位置
                startY: 0,        // 初始Y位置
                placedBeforeThisCall: false, // 记录本次调用前的placed状态
                icon: p.icon || `assets/passengers/${p.name}.png`, // 图标路径，默认为名称.png
                angryIcon: p.angryIcon || `assets/passengers/${p.name}Angry.png`, // 生气图标路径
                currentIcon: p.icon || `assets/passengers/${p.name}.png`, // 当前显示的图标
                isAngry: false,     // 是否生气状态
                pairedWith: p.pairedWith || null // 同伴ID（如果有）
            }));

            this.seats = this.createSeatsFromImage();
            this.totalPassengers = this.passengers.length;

            console.log(`✅ CSV配置加载完成：${this.totalPassengers}名乘客`);

            // 调试：显示所有乘客的描述
            console.log('📋 CSV乘客描述列表:');
            this.passengers.forEach(p => {
                console.log(`  ${p.id}. ${p.name}: "${p.description}"`);
            });
        }
        // ⚠️ 优先级2：如果CSV没有，尝试从gameConfig.js获取
        else if (typeof gameConfig !== 'undefined') {
            console.log('使用gameConfig.js中的配置文件');
            this.passengers = JSON.parse(JSON.stringify(gameConfig.passengers)).map(p => ({
                ...p,
                placed: false,      // 是否已放置
                seatId: null,       // 所在座位ID
                element: null,      // DOM元素引用
                satisfied: false,   // 是否满意
                startX: 0,         // 初始X位置
                startY: 0,        // 初始Y位置
                placedBeforeThisCall: false, // 记录本次调用前的placed状态
                icon: p.icon || `assets/passengers/${p.name}.png`, // 图标路径，默认为名称.png
                angryIcon: p.angryIcon || `assets/passengers/${p.name}Angry.png`, // 生气图标路径
                currentIcon: p.icon || `assets/passengers/${p.name}.png`, // 当前显示的图标
                isAngry: false,     // 是否生气状态

            }));
            this.seats = this.createSeatsFromImage();
            this.totalPassengers = this.passengers.length;
        }
        // ⚠️ 优先级3：如果都没有，使用默认配置
        else {
            console.log('使用默认配置');
            this.loadDefaultConfig();
        }

        console.log(`配置加载完成：${this.totalPassengers}名乘客，${this.seats.length}个座位`);
    }
    /**
     * ✅ 初始化游戏计时器（保持暂停状态）
     */
    initGameTimer() {
        console.log('⏱️ 初始化游戏计时器（保持暂停）');
        this.gameStartTime = 0;
        this.elapsedSeconds = 0;
        this.isGameTimerPaused = true; // ✅ 初始为暂停状态

        // 不启动计时器，等待 resumeGameTimer() 调用
    }
    /**
     * 创建座位数据（16个座位+3个站位）
     * @returns {Array} 座位数组
     */
    createSeatsFromImage() {
        const seats = [];

        // 定义哪些座位是靠窗的（根据你的图片布局）
        // 1-4是单人座靠窗，5、8、9、12、13、16是双人座的靠窗座位
        const windowSeatIds = [1, 2, 3, 4, 5, 8, 9, 12, 13, 16];

        // 创建16个座位（1-16）
        for (let i = 1; i <= 16; i++) {
            seats.push({
                id: i,
                type: 'seat',
                isWindow: windowSeatIds.includes(i), // ✅ 添加这个属性
                occupied: false,
                passengerId: null,
                element: null
            });
        }

        // 创建3个站位（17-19）
        for (let i = 17; i <= 19; i++) {
            seats.push({
                id: i,
                type: 'standing',
                isWindow: false, // ✅ 站位不靠窗
                occupied: false,
                passengerId: null,
                element: null
            });
        }

        return seats;
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        console.log('设置事件监听器...');

        // 游戏控制按钮事件
        document.getElementById('pause-button').addEventListener('click', () => this.togglePause());
        document.getElementById('continue-btn').addEventListener('click', () => this.togglePause());
        document.getElementById('restart-btn').addEventListener('click', async () => {
            // 先暂停游戏（如果还没暂停）
            this.isPaused = true;

            // 显示自定义重新开始确认弹窗
            const shouldRestart = await this.showRestartConfirmModal();
            if (shouldRestart) {
                this.restartGame();
            } else {
                // 如果用户取消，保持暂停状态
                this.isPaused = true;
            }
        });
        document.getElementById('home-btn').addEventListener('click', () => this.returnToHome());

        // 等待区空白区域点击事件 - 清除选择并放回乘客到等候区
        const waitingArea = document.getElementById('waiting-area');
        waitingArea.addEventListener('click', (e) => {
            if (this.isPaused) return;

            // 如果点击的不是乘客，则清除选择并将乘客放回等候区
            if (!e.target.closest('.waiting-passenger')) {
                console.log('点击等候区空白区域，尝试将选中乘客放回');
                this.clearSelection(true); // true表示放回等候区
            }
        });

        // 初始化座位点击事件
        this.initSeatsClickEvents();

        // 全局点击事件 - 点击空白处清除选择
        document.addEventListener('click', (e) => {
            // ✅ 关键修复：检查是否有活动对话弹窗
            const dialogOverlay = document.querySelector('.dialog-overlay');
            const dialogContainer = document.querySelector('.dialog-container');

            // 如果有对话弹窗，完全跳过游戏点击逻辑
            if (dialogOverlay || dialogContainer) {
                console.log('🎭 检测到对话弹窗，跳过游戏点击处理');
                return; // 让 DialogSystem 处理点击
            }

            if (this.isPaused) return;

            const clickedOnSeat = e.target.closest('.seat') || e.target.closest('.standing-spot');
            const clickedOnPassenger = e.target.closest('.waiting-passenger') || e.target.closest('.passenger-on-seat');
            const clickedOnWaitingArea = e.target.closest('#waiting-area');

            // 如果点击的是座位或乘客，不处理（由各自的事件处理）
            // 如果点击的是等候区，也不处理（由等候区事件处理）
            if (clickedOnSeat || clickedOnPassenger || clickedOnWaitingArea) return;

            // 点击空白处，清除选择（不放回等候区）
            this.clearSelection();
        });

        // 鼠标移动事件 - 处理拖拽跟随
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));

        console.log('事件监听器设置完成');
    }

    /**
     * 初始化座位点击事件
     */
    initSeatsClickEvents() {
        console.log('初始化座位点击事件...');

        const seats = document.querySelectorAll('.seat, .standing-spot');

        seats.forEach(seatElement => {
            // 克隆元素避免重复绑定事件
            const newSeatElement = seatElement.cloneNode(true);
            seatElement.parentNode.replaceChild(newSeatElement, seatElement);

            // 添加点击事件
            newSeatElement.addEventListener('click', (e) => {
                e.stopPropagation(); // 阻止事件冒泡
                if (this.isPaused) return;
                this.handleSeatClick(newSeatElement);
            });

            // 存储座位元素引用到座位对象
            const seatId = parseInt(newSeatElement.dataset.seatId);
            const seat = this.seats.find(s => s.id === seatId);
            if (seat) {
                seat.element = newSeatElement;
            }
        });

        console.log(`座位点击事件初始化完成：${seats.length}个座位`);
    }

    /**
     * 处理座位点击
     * @param {HTMLElement} seatElement 被点击的座位元素
     */
    handleSeatClick(seatElement) {
        const seatId = parseInt(seatElement.dataset.seatId);
        const seat = this.seats.find(s => s.id === seatId);

        if (!seat) {
            console.warn(`未找到座位ID: ${seatId}`);
            return;
        }

        console.log(`点击座位: ${seatId}, 状态: ${seat.occupied ? '已占用' : '空置'}, 占用者: ${seat.passengerId}`);

        // 情况1: 有选中乘客
        if (this.selectedPassenger) {
            console.log(`当前选中乘客: ${this.selectedPassenger.name}`);

            // 情况1a: 座位已被占用 → 交换乘客
            if (seat.occupied) {
                console.log(`座位${seatId}被乘客${seat.passengerId}占用，执行交换`);
                // 使用简化版的交换方法
                this.simpleSwapPassengers(seat);
            }
            // 情况1b: 座位空置 → 放置乘客
            else {
                console.log(`座位${seatId}空置，放置选中乘客`);
                this.placePassengerOnSeat(this.selectedPassenger.id, seatId);
            }
        }
        // 情况2: 没有选中乘客，但座位上有乘客 → 选择该乘客
        else if (seat.occupied) {
            const passenger = this.passengers.find(p => p.id === seat.passengerId);
            if (passenger) {
                console.log(`点击座位上的乘客: ${passenger.name} (座位${seatId})`);
                this.selectPassengerFromSeat(passenger);
            }
        }
        // 情况3: 没有选中乘客，座位空置 → 不做任何操作
        else {
            console.log(`点击空座位${seatId}，无操作`);
        }
    }

    /**
     * 简化版乘客交换 - 直接交换座位
     * @param {Object} targetSeat 目标座位
     */
    simpleSwapPassengers(targetSeat) {
        if (!this.selectedPassenger || !targetSeat.occupied) return;

        const passengerAId = targetSeat.passengerId; // 座位上的乘客
        const passengerBId = this.selectedPassenger.id; // 选中的乘客

        // 如果是同一个乘客，取消选择
        if (passengerAId === passengerBId) {
            this.clearSelection();
            return;
        }

        const passengerA = this.passengers.find(p => p.id === passengerAId);
        const passengerB = this.selectedPassenger;

        console.log(`简化交换: 选中乘客B(${passengerB.name})点击座位上的乘客A(${passengerA.name})`);
        console.log(`乘客B原座位: ${passengerB.placed ? passengerB.seatId : '等候区'}`);
        console.log(`乘客A当前座位: ${passengerA.seatId}`);

        // 1. 保存乘客B的原座位信息
        const seatBId = passengerB.placed ? passengerB.seatId : null;

        // 2. 将选中的乘客B放置到目标座位
        if (passengerB.placed && seatBId) {
            const oldSeatB = this.seats.find(s => s.id === seatBId);
            if (oldSeatB) {
                oldSeatB.occupied = false;
                oldSeatB.passengerId = null;
                if (oldSeatB.element) {
                    oldSeatB.element.classList.remove('occupied');
                }
            }
            this.removePassengerFromDisplay(passengerB.id);
        }

        // 3. 将乘客A从目标座位移除
        targetSeat.occupied = false;
        targetSeat.passengerId = null;
        if (targetSeat.element) {
            targetSeat.element.classList.remove('occupied');
        }
        this.removePassengerFromDisplay(passengerA.id);

        // 4. 将乘客B放置到目标座位
        passengerB.placed = true;
        passengerB.seatId = targetSeat.id;
        targetSeat.occupied = true;
        targetSeat.passengerId = passengerB.id;

        if (targetSeat.element) {
            targetSeat.element.classList.add('occupied');
        }

        this.addPassengerToSeat(passengerB, targetSeat);

        // 5. 处理乘客A
        if (seatBId) {
            const seatB = this.seats.find(s => s.id === seatBId);
            if (seatB) {
                passengerA.placed = true;
                passengerA.seatId = seatBId;
                seatB.occupied = true;
                seatB.passengerId = passengerA.id;

                if (seatB.element) {
                    seatB.element.classList.add('occupied');
                }

                this.addPassengerToSeat(passengerA, seatB);

                setTimeout(() => {
                    this.selectPassenger(passengerA);
                    this.showPassengerDemand(passengerA, true);
                }, 10);
            }
        } else {
            passengerA.placed = false;
            passengerA.seatId = null;

            this.selectPassenger(passengerA);
            this.showPassengerDemand(passengerA, true);
        }

        this.updateUI();
        this.updateSatisfactionDisplay();
        // 强制更新所有相关乘客的心情
        this.updatePassengerSatisfaction(passengerA);
        this.updatePassengerSatisfaction(passengerB);
        // 在 simpleSwapPassengers 方法的末尾，console.log(`简化交换完成`); 之前添加：
        // ===== 新增：强制触发乘客的条件对话 =====
        setTimeout(() => {
            // 触发乘客A的条件对话
            if (passengerA && passengerA.placed) {
                console.log(`🔄 交换后触发 ${passengerA.name} 的条件对话`);
                const seatA = this.seats.find(s => s.id === passengerA.seatId);
                this.triggerAllPassengerDialogs(passengerA, seatA);
            }

            // 触发乘客B的条件对话
            if (passengerB && passengerB.placed) {
                console.log(`🔄 交换后触发 ${passengerB.name} 的条件对话`);
                const seatB = this.seats.find(s => s.id === passengerB.seatId);
                this.triggerAllPassengerDialogs(passengerB, seatB);
            }
        }, 100);
        // ======================================

        console.log(`简化交换完成`);
    }

    /**
     * 渲染等待区的乘客
     */
    renderWaitingPassengers() {
        const waitingArea = document.getElementById('waiting-area');
        if (!waitingArea) return;

        waitingArea.innerHTML = '';
        const cols = 6;
        const cellWidth = 90;
        const cellHeight = 90;
        const startX = 50;
        const startY = 50;

        this.passengers.forEach((passenger, index) => {
            if (passenger.placed) return;

            const row = Math.floor(index / cols);
            const col = index % cols;
            const x = startX + col * cellWidth;
            const y = startY + row * cellHeight;

            const passengerElement = document.createElement('div');
            passengerElement.className = 'waiting-passenger';
            passengerElement.dataset.passengerId = passenger.id;
            passengerElement.style.left = `${x}px`;
            passengerElement.style.top = `${y}px`;

            // 关键修改：使用图标而不是文字
            if (passenger.icon) {
                // 创建图片元素
                const img = document.createElement('img');
                img.src = passenger.icon;
                img.alt = passenger.name;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.borderRadius = '50%';
                img.style.objectFit = 'cover';
                passengerElement.appendChild(img);

                // 添加角色名称标签
                // const nameLabel = document.createElement('div');
                // nameLabel.textContent = passenger.name;
                // nameLabel.style.position = 'absolute';
                // nameLabel.style.bottom = '-20px';
                // nameLabel.style.left = '50%';
                // nameLabel.style.transform = 'translateX(-50%)';
                // nameLabel.style.color = 'white';
                // nameLabel.style.fontSize = '12px';
                // nameLabel.style.whiteSpace = 'nowrap';
                // passengerElement.appendChild(nameLabel);
            } else {
                // 如果没有图标，使用文字作为后备
                passengerElement.textContent = passenger.name.charAt(0);
            }

            passenger.startX = x;
            passenger.startY = y;

            // 点击事件
            passengerElement.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.selectPassenger(passenger);
            });

            // 鼠标进入事件 - 立即显示需求卡
            passengerElement.addEventListener('mouseenter', (e) => {
                e.stopPropagation();
                console.log(`鼠标进入乘客 ${passenger.name}`);

                // 立即更新当前悬停的乘客
                this.currentHoveredPassenger = passenger.id;

                // 立即显示需求卡
                this.showPassengerDemand(passenger);
            });

            // 鼠标离开事件
            passengerElement.addEventListener('mouseleave', (e) => {
                console.log(`鼠标离开乘客 ${passenger.name}`);

                // 检查鼠标是否移到了另一个乘客上
                const relatedTarget = e.relatedTarget;
                let movedToAnotherPassenger = false;

                if (relatedTarget) {
                    // 检查是否移到了等待区乘客
                    const toWaitingPassenger = relatedTarget.closest('.waiting-passenger');
                    // 检查是否移到了已放置乘客
                    const toPlacedPassenger = relatedTarget.closest('.passenger-on-seat');

                    if (toWaitingPassenger || toPlacedPassenger) {
                        movedToAnotherPassenger = true;
                        console.log('移到了另一个乘客上');
                    }
                }

                // 如果没有移到另一个乘客，清除悬停状态
                if (!movedToAnotherPassenger) {
                    this.currentHoveredPassenger = null;

                    // 如果没有选中乘客，延迟隐藏需求卡
                    if (!this.selectedPassenger) {
                        setTimeout(() => {
                            if (!this.currentHoveredPassenger) {
                                this.hidePassengerDemand();
                            }
                        }, 100);
                    }
                }
            });

            passenger.element = passengerElement;
            waitingArea.appendChild(passengerElement);
        });
    }

    /**
     * 选择乘客
     * @param {Object} passenger 乘客对象
     */
    selectPassenger(passenger) {
        console.log('选择乘客:', passenger.name, '当前状态: placed=', passenger.placed, 'seatId=', passenger.seatId);

        // 清除之前选中的样式
        if (this.selectedPassenger && this.selectedPassenger.element) {
            this.selectedPassenger.element.classList.remove('selected');
            this.selectedPassenger.element.style.zIndex = 'auto';
            // 恢复之前选中乘客的显示状态（如果不在座位上）
            if (!this.selectedPassenger.placed) {
                this.selectedPassenger.element.style.display = 'block';
            }
        }

        // 设置新的选中状态
        this.selectedPassenger = passenger;
        this.isDragging = true;

        // 更新乘客元素样式
        if (passenger.element) {
            passenger.element.classList.add('selected');
            passenger.element.style.zIndex = this.getHighestZIndex();
            passenger.element.style.cursor = 'grabbing';

            // 关键修改：选中时隐藏原始图标
            passenger.element.style.display = 'none';

            // 如果是等候区乘客，重置位置
            if (!passenger.placed) {
                passenger.element.style.left = `${passenger.startX}px`;
                passenger.element.style.top = `${passenger.startY}px`;
            }
        }

        // 设置跟随鼠标的乘客元素 - 使用图标
        this.followingPassenger.innerHTML = ''; // 清空原有内容

        if (passenger.icon) {
            // 创建图片元素
            const img = document.createElement('img');
            img.src = passenger.icon;
            img.alt = passenger.name;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.borderRadius = '50%';
            img.style.objectFit = 'cover';
            this.followingPassenger.appendChild(img);
        } else {
            // 如果没有图标，使用文字
            this.followingPassenger.innerHTML = passenger.name.charAt(0);
        }

        this.followingPassenger.style.display = 'block';
        this.followingPassenger.style.zIndex = '9999';
        this.followingPassenger.classList.add('show');

        // 显示选中乘客的需求卡
        this.showPassengerDemand(passenger, true);

        console.log(`乘客 ${passenger.name} 已被选中，跟随鼠标显示`);
    }

    /**
     * 获取最高层级值
     */
    getHighestZIndex() {
        this.zIndexCounter += 10;
        return this.zIndexCounter.toString();
    }

    /**
     * 从座位选择乘客
     * @param {Object} passenger 乘客对象
     */
    selectPassengerFromSeat(passenger) {
        console.log(`从座位选择乘客: ${passenger.name} (座位${passenger.seatId})`);

        // 关键：从座位移除乘客，但保持选中状态
        if (passenger.placed && passenger.seatId) {
            const seat = this.seats.find(s => s.id === passenger.seatId);
            if (seat) {
                // 从座位移除
                seat.occupied = false;
                seat.passengerId = null;
                if (seat.element) {
                    seat.element.classList.remove('occupied');
                }
            }

            // 更新乘客状态
            passenger.placed = false;
            passenger.seatId = null;

            // 从显示区域移除
            this.removePassengerFromDisplay(passenger.id);

            // 注意：不更新placedCount，因为只是变成选中状态
        }

        // 设置为选中状态
        this.selectPassenger(passenger);
    }


    /**
     * 放置乘客到座位
     * @param {number} passengerId 乘客ID
     * @param {number} seatId 座位ID
     */
    placePassengerOnSeat(passengerId, seatId) {
        const self = this; // 保存 this 引用
        const passenger = this.passengers.find(p => p.id === passengerId);
        const seat = this.seats.find(s => s.id === seatId);

        if (!passenger || !seat) {
            console.error(`放置乘客失败: 乘客${passengerId}或座位${seatId}不存在`);
            return;
        }

        // 如果目标座位已被占用，且不是当前选中的乘客，则不能放置
        if (seat.occupied && seat.passengerId !== passengerId) {
            console.log(`座位${seat.id}已被占用`);
            return;
        }

        // 如果乘客之前已经在其他座位上，先移除
        if (passenger.placed && passenger.seatId !== seatId) {
            console.log(`乘客 ${passenger.name} 从原座位 ${passenger.seatId} 移除`);
            this.removePassengerFromSeat(passengerId);
            this.removeChatBubble(passengerId);
        }

        console.log(`放置乘客${passenger.name}到座位${seatId}`);

        // 更新状态和视觉
        passenger.placed = true;
        passenger.seatId = seatId;
        seat.occupied = true;
        seat.passengerId = passengerId;

        if (seat.element) seat.element.classList.add('occupied');
        if (passenger.element) {
            passenger.element.classList.add('placed');
            passenger.element.style.display = 'none';
        }

        // 在座位上显示乘客
        this.addPassengerToSeat(passenger, seat);

        // 更新满意度和 UI
        this.updatePassengerSatisfaction(passenger);
        this.updateSatisfactionDisplay();

        // ===== 新增：强制更新所有可能受影响的乘客 =====
        // 当放置的乘客有同伴时，更新同伴的心情
        if (passenger.pairedWith) {
            const pairedPassenger = this.passengers.find(p => p.id === passenger.pairedWith);
            if (pairedPassenger && pairedPassenger.placed) {
                console.log(`🔄 同伴 ${pairedPassenger.name} 可能受影响，强制更新心情`);
                this.updatePassengerSatisfaction(pairedPassenger);
            }
        }

        // 检查周围座位的乘客是否受影响（比如有吃东西的乘客）
        const adjacentSeatIds = this.getAdjacentSeatIds(seat.id);
        adjacentSeatIds.forEach(adjSeatId => {
            const adjSeat = this.seats.find(s => s.id === adjSeatId);
            if (adjSeat && adjSeat.occupied) {
                const adjPassenger = this.passengers.find(p => p.id === adjSeat.passengerId);
                if (adjPassenger && adjPassenger.id !== passenger.id) {
                    console.log(`🔄 邻座乘客 ${adjPassenger.name} 可能受影响，强制更新心情`);
                    this.updatePassengerSatisfaction(adjPassenger);
                }
            }
        });
        // ============================================

        // --- 核心修复修改点如下 ---

        // 1. 先清除选择状态（确保清理逻辑在气泡弹出前跑完）
        this.clearSelection();

        // 2. 使用 setTimeout 延迟触发对话（解决瞬间消失的关键）
        // 延迟 50 毫秒是为了避开 clearSelection 带来的 DOM 刷新干扰
        setTimeout(() => {
            console.log(`延迟触发 ${passenger.name} 的对话气泡`);
            // 使用箭头函数确保 this 指向正确
            if (this && typeof this.triggerAllPassengerDialogs === 'function') {
                this.triggerAllPassengerDialogs(passenger, seat);
            } else {
                console.error('❌ triggerAllPassengerDialogs 不是函数', this);
                // 备用方案：直接调用
                if (window.gameInstance && window.gameInstance.triggerAllPassengerDialogs) {
                    window.gameInstance.triggerAllPassengerDialogs(passenger, seat);
                }
            }
        }, 50);

        // --- 修复结束 ---

        // 更新统计
        this.placedCount++;
        this.updateUI();

        // 检查游戏是否完成
        this.checkGameComplete();
    }

    /**
     * 统一触发所有乘客放置对话
     * @param {Object} passenger 乘客对象
     * @param {Object} seat 座位对象
     */
    triggerAllPassengerDialogs(passenger, seat) {
        console.log(`🎭 ======== 触发 ${passenger.name} 的所有放置对话 ========`);

        const isSatisfied = this.checkPassengerSatisfaction(passenger);
        if (!this.dialogSystem) return;

        let hasTriggeredConditionDialog = false;

        // 定义需要检查的条件
        const conditions = [
            { name: 'window_seat', check: () => seat.isWindow === true },
            { name: 'near_eating', check: () => this.checkEatingNeighbor(seat.id) },
            {
                name: 'paired_together',
                check: () => {
                    if (!passenger.pairedWith) return false;
                    const pairedP = this.passengers.find(p => p.id === passenger.pairedWith);
                    return pairedP && pairedP.placed && pairedP.seatId &&
                        this.checkIfAdjacentSeats(passenger.seatId, pairedP.seatId);
                }
            },
            // 👇 新增：同伴未上车（期待状态）
            {
                name: 'paired_expected',
                check: () => {
                    if (!passenger.pairedWith) return false;
                    const pairedP = this.passengers.find(p => p.id === passenger.pairedWith);
                    return !pairedP || !pairedP.placed; // 同伴未上车
                }
            },
            // 👇 新增：同伴已上车但不相邻（生气状态）
            {
                name: 'paired_apart',
                check: () => {
                    if (!passenger.pairedWith) return false;
                    const pairedP = this.passengers.find(p => p.id === passenger.pairedWith);
                    if (!pairedP || !pairedP.placed) return false;
                    return !this.checkIfAdjacentSeats(passenger.seatId, pairedP.seatId); // 已上车但不相邻
                }
            },
            {
                name: 'position_requirement',
                check: () => true
            },
            {
                name: 'adjacent_check',
                check: () => true
            },
            // ===== 新增：条件组检查 =====
            {
                name: 'group_condition',
                check: () => true  // 实际逻辑在 findConditionDialog 中处理
            }
        ];

        // 1. 优先检查特定的条件气泡
        for (const condition of conditions) {
            if (condition.check()) {
                const conditionDialog = this.findConditionDialog(passenger, condition.name);
                if (conditionDialog) {
                    console.log(`🎯 命中条件对话: ${condition.name}`);
                    this.dialogSystem.triggerDialog(conditionDialog, null, passenger);
                    hasTriggeredConditionDialog = true;
                    // break;
                }
            }
        }

        // 2. 如果没有条件气泡，才显示通用的满意/不满意气泡
        if (!hasTriggeredConditionDialog) {
            const passengerSpecificDialog = this.findPassengerSpecificDialog(passenger, isSatisfied);
            if (passengerSpecificDialog) {
                this.dialogSystem.triggerDialog(passengerSpecificDialog, null, passenger);
            } else {
                this.triggerGeneralSatisfactionDialog(passenger, seat, isSatisfied);
            }
        }
    }




    /**
     * 查找条件特定对话
     */
    findConditionDialog(passenger, condition) {
        if (!this.dialogSystem || !this.dialogSystem.dialogs) {
            console.warn('⚠️ 对话系统未初始化');
            return null;
        }

        // 清理乘客名字
        const cleanPassengerName = passenger.name.replace(/\s+/g, '').trim();

        console.log(`🔍 查找条件对话: 乘客="${cleanPassengerName}", 条件="${condition}"`);

        // 获取当前座位类型
        const seat = this.seats.find(s => s.id === passenger.seatId);
        let currentSeatType = '';
        let currentSeatPosition = '';

        if (seat) {
            if (seat.type === 'standing') {
                currentSeatType = 'standing';
            } else if (seat.type === 'seat') {
                if (seat.isWindow) {
                    currentSeatType = 'window';
                } else {
                    currentSeatType = 'aisle';
                }
            }

            // 判断前后排
            if (seat.id <= 8) {
                currentSeatPosition = 'front';
            } else {
                currentSeatPosition = 'back';
            }
        }

        console.log(`  当前座位: ID=${seat?.id}, 类型=${currentSeatType}, 位置=${currentSeatPosition}`);

        // 过滤出所有可能的对话
        const potentialDialogs = this.dialogSystem.dialogs.filter(d => {
            // 基本条件检查
            if (d.trigger_type !== 'condition_specific') return false;
            // 放宽内容类型检查，故事对话也能通过
            if (d.content_type !== 'story' && d.content_type !== 'bubble' && d.content_type !== 'narrative') {
                return false;
            }
            if (d.trigger_condition !== condition) return false;

            // 检查乘客名（如果有指定）
            if (d.condition_passenger && d.condition_passenger.trim() !== '') {
                const cleanDialogPassenger = d.condition_passenger.replace(/\s+/g, '').trim();
                if (cleanDialogPassenger !== cleanPassengerName) return false;
            }

            // 检查座位类型条件（如果有指定）
            if (d.condition_seat_type && d.condition_seat_type.trim() !== '') {
                const seatTypeCondition = d.condition_seat_type.trim();

                // 如果条件指定为 "seat"，则匹配所有座位类型（window 和 aisle）
                if (seatTypeCondition === 'seat') {
                    if (currentSeatType !== 'window' && currentSeatType !== 'aisle') {
                        return false;
                    }
                }
                // 否则进行精确匹配
                else if (seatTypeCondition !== currentSeatType && seatTypeCondition !== currentSeatPosition) {
                    return false;
                }
            }

            // 检查附近乘客条件（如果有指定）
            // 检查附近乘客条件（如果有指定）
            if (d.condition_near_passenger && d.condition_near_passenger.trim() !== '') {
                const nearPassengerName = d.condition_near_passenger.trim();
                console.log(`  检查附近乘客条件: 需要附近有 "${nearPassengerName}"`);

                const nearPassenger = this.passengers.find(p => p.name === nearPassengerName);

                if (!nearPassenger) {
                    console.log(`  ❌ 找不到乘客 "${nearPassengerName}"`);
                    return false;
                }

                if (!nearPassenger.placed) {
                    console.log(`  ❌ 乘客 "${nearPassengerName}" 还未放置`);
                    return false;
                }

                if (!nearPassenger.seatId) {
                    console.log(`  ❌ 乘客 "${nearPassengerName}" 没有座位ID`);
                    return false;
                }

                // 注意：对于 paired_apart 条件，我们需要的是不相邻，所以这里要特殊处理
                const isAdjacent = this.checkIfAdjacentSeats(passenger.seatId, nearPassenger.seatId);
                console.log(`  检查相邻: 当前乘客座位=${passenger.seatId}, 附近乘客座位=${nearPassenger.seatId}, 是否相邻=${isAdjacent}`);

                // 对于 paired_apart，我们需要的是不相邻
                if (condition === 'paired_apart') {
                    if (isAdjacent) {
                        console.log(`  ❌ 相邻了，不满足不相邻条件`);
                        return false;
                    }
                    console.log(`  ✅ 不相邻条件满足`);
                } else {
                    // 其他条件需要相邻
                    if (!isAdjacent) {
                        console.log(`  ❌ 不相邻`);
                        return false;
                    }
                    console.log(`  ✅ 附近乘客条件满足`);
                }
            }
            // ===== 新增：检查条件组 =====
            if (!this.checkConditionGroup(d, passenger)) {
                return false;
            }
            // ==========================


            // 所有条件都满足
            return true;
        });

        console.log(`  找到 ${potentialDialogs.length} 个满足条件的对话`);

        if (potentialDialogs.length === 0) {
            console.log(`❌ 未找到满足条件的对话`);
            return null;
        }

        // 按优先级和条件数量排序
        potentialDialogs.sort((a, b) => {
            // 先按优先级排序（数值越小越优先）
            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }

            // 优先级相同时，计算条件数量
            const countConditions = (d) => {
                let count = 0;
                if (d.condition_passenger && d.condition_passenger.trim() !== '') count++;
                if (d.condition_seat_type && d.condition_seat_type.trim() !== '') count++;
                if (d.condition_near_passenger && d.condition_near_passenger.trim() !== '') count++;
                if (d.condition_game_time && d.condition_game_time > 0) count++;
                return count;
            };

            const aConditions = countConditions(a);
            const bConditions = countConditions(b);

            // 条件越多越优先（倒序）
            if (aConditions !== bConditions) {
                return bConditions - aConditions;
            }

            // ===== 新增：如果属于同一条件组，按ID升序排列 =====
            if (a.condition_group && b.condition_group && a.condition_group === b.condition_group) {
                return a.id - b.id; // ID越小越优先
            }
            // ===============================================

            return 0;
        });

        const selectedDialog = potentialDialogs[0];
        console.log(`✅ 选择对话: ID=${selectedDialog.id}, 优先级=${selectedDialog.priority}, 文本="${selectedDialog.dialog_text.substring(0, 30)}..."`);

        // ===== 新增：通过 chain_id 确保对话链从第一条开始 =====
        if (selectedDialog.chain_id && selectedDialog.chain_id.trim() !== '') {
            const chainKey = `chain_${selectedDialog.chain_id}`;

            // 如果这个对话链还没有触发过
            if (this.dialogSystem && !this.dialogSystem.triggeredDialogs.has(chainKey)) {

                // 查找这个对话链中 ID 最小的对话（即第一条）
                const chainDialogs = this.dialogSystem.dialogs
                    .filter(d => d.chain_id === selectedDialog.chain_id)
                    .sort((a, b) => a.id - b.id);

                if (chainDialogs.length > 0) {
                    const firstDialog = chainDialogs[0];

                    // 如果当前选择的不是第一条，则返回第一条
                    if (firstDialog.id !== selectedDialog.id) {
                        console.log(`   🔄 对话链 ${selectedDialog.chain_id} 首次触发，强制使用第一条对话 ID=${firstDialog.id}`);

                        // 标记这个对话链已触发
                        this.dialogSystem.triggeredDialogs.add(chainKey);

                        // 同时标记第一条对话本身
                        this.dialogSystem.triggeredDialogs.add(firstDialog.id);

                        return firstDialog;
                    } else {
                        // 当前就是第一条，正常返回，同时标记对话链已触发
                        console.log(`   ✅ 对话链 ${selectedDialog.chain_id} 首次触发，使用第一条对话 ID=${firstDialog.id}`);
                        this.dialogSystem.triggeredDialogs.add(chainKey);
                    }
                }
            }
        }
        // ============================================================
        // ============================================================

        return selectedDialog;
    }



    /**
     * 检查条件组
     * @param {Object} dialog 对话对象
     * @param {Object} currentPassenger 当前触发的乘客
     * @returns {boolean} 是否满足条件
     */
    checkConditionGroup(dialog, currentPassenger) {
        if (!dialog.condition_group_type) return true;

        const groupType = dialog.condition_group_type;
        const params = dialog.condition_group_params || [];

        console.log(`  🔍 检查条件组: ${groupType}, 参数:`, params);

        switch (groupType) {
            case 'both_standing':
                // 检查指定的一组乘客是否都在站位
                if (params.length === 0) return false;

                // 检查每个指定的乘客
                for (const passengerName of params) {
                    const passenger = this.passengers.find(p => p.name === passengerName);
                    if (!passenger) {
                        console.log(`    ❌ 找不到乘客: ${passengerName}`);
                        return false;
                    }

                    if (!passenger.placed) {
                        console.log(`    ❌ 乘客未放置: ${passengerName}`);
                        return false;
                    }

                    const seat = this.seats.find(s => s.id === passenger.seatId);
                    if (!seat || seat.type !== 'standing') {
                        console.log(`    ❌ 乘客不在站位: ${passengerName}`);
                        return false;
                    }
                }

                console.log(`    ✅ 所有指定乘客都在站位`);

                // 创建唯一键防止重复触发
                const groupKey = `group_${groupType}_${params.sort().join('_')}`;
                if (this.dialogSystem && !this.dialogSystem.triggeredDialogs.has(groupKey)) {
                    this.dialogSystem.triggeredDialogs.add(groupKey);
                    return true;
                }
                console.log(`    ⏭️ 该条件组已触发过，跳过`);
                return false;

            case 'both_in_seat':
                // 检查指定的一组乘客是否都在座位上（任何座位）
                if (params.length === 0) return false;

                for (const passengerName of params) {
                    const passenger = this.passengers.find(p => p.name === passengerName);
                    if (!passenger || !passenger.placed) return false;

                    const seat = this.seats.find(s => s.id === passenger.seatId);
                    if (!seat || seat.type !== 'seat') return false;
                }

                const groupKey2 = `group_${groupType}_${params.sort().join('_')}`;
                if (this.dialogSystem && !this.dialogSystem.triggeredDialogs.has(groupKey2)) {
                    this.dialogSystem.triggeredDialogs.add(groupKey2);
                    return true;
                }
                return false;

            case 'both_in_seat_type':
                // 检查指定的一组乘客是否都在特定类型的座位
                // 格式: both_in_seat_type:座位类型,乘客1,乘客2,...
                if (params.length < 2) return false;

                const seatType = params[0]; // 第一个参数是座位类型
                const passengers = params.slice(1); // 后面的参数是乘客名字

                for (const passengerName of passengers) {
                    const passenger = this.passengers.find(p => p.name === passengerName);
                    if (!passenger || !passenger.placed) return false;

                    const seat = this.seats.find(s => s.id === passenger.seatId);
                    if (!seat) return false;

                    // 判断座位类型
                    let actualSeatType = seat.type;
                    if (seat.type === 'seat') {
                        if (seat.isWindow) {
                            actualSeatType = 'window';
                        } else {
                            actualSeatType = 'aisle';
                        }
                    }

                    if (actualSeatType !== seatType) return false;
                }

                const groupKey3 = `group_${groupType}_${params.join('_')}`;
                if (this.dialogSystem && !this.dialogSystem.triggeredDialogs.has(groupKey3)) {
                    this.dialogSystem.triggeredDialogs.add(groupKey3);
                    return true;
                }
                return false;

            default:
                console.log(`    ❌ 未知的条件组类型: ${groupType}`);
                return false;
        }
    }




    // /**
    //  * 查找条件特定对话
    //  */
    // findConditionDialog(passenger, condition) {
    //     if (!this.dialogSystem || !this.dialogSystem.dialogs) {
    //         console.warn('⚠️ 对话系统未初始化');
    //         return null;
    //     }

    //     // 清理乘客名字
    //     const cleanPassengerName = passenger.name.replace(/\s+/g, '').trim();

    //     console.log(`🔍 查找条件对话: 乘客="${cleanPassengerName}", 条件="${condition}"`);

    //     // 获取当前座位类型
    //     const seat = this.seats.find(s => s.id === passenger.seatId);
    //     let currentSeatType = '';
    //     let currentSeatPosition = '';

    //     if (seat) {
    //         if (seat.type === 'standing') {
    //             currentSeatType = 'standing';
    //         } else if (seat.type === 'seat') {
    //             if (seat.isWindow) {
    //                 currentSeatType = 'window';
    //             } else {
    //                 currentSeatType = 'aisle';
    //             }
    //         }

    //         // 判断前后排
    //         if (seat.id <= 8) {
    //             currentSeatPosition = 'front';
    //         } else {
    //             currentSeatPosition = 'back';
    //         }
    //     }

    //     console.log(`  当前座位: ID=${seat?.id}, 类型=${currentSeatType}, 位置=${currentSeatPosition}`);

    //     // 过滤出所有可能的对话
    //     const potentialDialogs = this.dialogSystem.dialogs.filter(d => {
    //         // 基本条件检查
    //         if (d.trigger_type !== 'condition_specific') return false;
    //         if (d.content_type !== 'bubble') return false;
    //         if (d.trigger_condition !== condition) return false;

    //         // 检查乘客名（如果有指定）
    //         if (d.condition_passenger && d.condition_passenger.trim() !== '') {
    //             const cleanDialogPassenger = d.condition_passenger.replace(/\s+/g, '').trim();
    //             if (cleanDialogPassenger !== cleanPassengerName) return false;
    //         }

    //         // 检查座位类型条件（如果有指定）
    //         if (d.condition_seat_type && d.condition_seat_type.trim() !== '') {
    //             const seatTypeCondition = d.condition_seat_type.trim();

    //             // 如果条件指定为 "seat"，则匹配所有座位类型（window 和 aisle）
    //             if (seatTypeCondition === 'seat') {
    //                 if (currentSeatType !== 'window' && currentSeatType !== 'aisle') {
    //                     return false;
    //                 }
    //             }
    //             // 否则进行精确匹配
    //             else if (seatTypeCondition !== currentSeatType && seatTypeCondition !== currentSeatPosition) {
    //                 return false;
    //             }
    //         }

    //         // 检查附近乘客条件（如果有指定）
    //         if (d.condition_near_passenger && d.condition_near_passenger.trim() !== '') {
    //             const nearPassengerName = d.condition_near_passenger.trim();
    //             const nearPassenger = this.passengers.find(p => p.name === nearPassengerName);

    //             if (!nearPassenger || !nearPassenger.placed) {
    //                 return false; // 指定的乘客还没放置
    //             }

    //             // 检查是否相邻
    //             if (!this.checkIfAdjacentSeats(passenger.seatId, nearPassenger.seatId)) {
    //                 return false; // 不相邻
    //             }
    //         }

    //         // 所有条件都满足
    //         return true;
    //     });

    //     console.log(`  找到 ${potentialDialogs.length} 个满足条件的对话`);

    //     if (potentialDialogs.length === 0) {
    //         console.log(`❌ 未找到满足条件的对话`);
    //         return null;
    //     }

    //     // 按优先级和条件数量排序
    //     potentialDialogs.sort((a, b) => {
    //         // 先按优先级排序（数值越小越优先）
    //         if (a.priority !== b.priority) {
    //             return a.priority - b.priority;
    //         }

    //         // 优先级相同时，计算条件数量
    //         const countConditions = (d) => {
    //             let count = 0;
    //             if (d.condition_passenger && d.condition_passenger.trim() !== '') count++;
    //             if (d.condition_seat_type && d.condition_seat_type.trim() !== '') count++;
    //             if (d.condition_near_passenger && d.condition_near_passenger.trim() !== '') count++;
    //             if (d.condition_game_time && d.condition_game_time > 0) count++;
    //             return count;
    //         };

    //         const aConditions = countConditions(a);
    //         const bConditions = countConditions(b);

    //         // 条件越多越优先（倒序）
    //         return bConditions - aConditions;
    //     });

    //     const selectedDialog = potentialDialogs[0];
    //     console.log(`✅ 选择对话: ID=${selectedDialog.id}, 优先级=${selectedDialog.priority}, 文本="${selectedDialog.dialog_text}"`);

    //     return selectedDialog;
    // }

    /**
     * 查找乘客特定放置对话
     */
    findPassengerSpecificDialog(passenger, isSatisfied) {
        if (!this.dialogSystem || !this.dialogSystem.dialogs) {
            return null;
        }

        const cleanPassengerName = passenger.name.replace(/\s+/g, '').trim();

        // 查找乘客特定放置对话
        const passengerDialogs = this.dialogSystem.dialogs.filter(dialog => {
            if (dialog.trigger_type !== 'seat_assigned') return false;
            if (dialog.trigger_target !== 'seat') return false;
            if (!dialog.condition_passenger) return false;

            const cleanDialogPassenger = dialog.condition_passenger.replace(/\s+/g, '').trim();
            return cleanDialogPassenger === cleanPassengerName;
        });

        if (passengerDialogs.length === 0) {
            return null;
        }

        // 优先选择与满意度匹配的对话
        const moodMatchDialogs = passengerDialogs.filter(dialog => {
            const condition = isSatisfied ? 'satisfied' : 'unsatisfied';
            return dialog.trigger_condition === condition;
        });

        if (moodMatchDialogs.length > 0) {
            moodMatchDialogs.sort((a, b) => a.priority - b.priority);
            return moodMatchDialogs[0];
        }

        // 如果没有满意度匹配的，返回第一个
        passengerDialogs.sort((a, b) => a.priority - b.priority);
        return passengerDialogs[0];
    }

    /**
     * ✅ 获取条件特定对话 - 确保正确匹配
     */
    getConditionSpecificDialog(passenger, seat, condition) {
        if (!this.dialogSystem) {
            console.warn('⚠️ 对话系统未初始化');
            return null;
        }

        console.log(`🔍 查找 ${passenger.name} 的 ${condition} 条件对话`);

        // 清理乘客名字（去除空白、转为小写）
        const cleanPassengerName = passenger.name.trim().toLowerCase();

        // 过滤条件对话
        const conditionDialogs = this.dialogSystem.dialogs.filter(dialog => {
            // 检查触发类型
            const triggerMatch = dialog.trigger_type === 'condition_specific';
            // 检查内容类型
            const contentMatch = dialog.content_type === 'bubble';
            // 检查乘客名称（清理后比较）
            const passengerMatch = dialog.condition_passenger &&
                dialog.condition_passenger.trim().toLowerCase() === cleanPassengerName;
            // 检查条件
            const conditionMatch = dialog.trigger_condition === condition;

            return triggerMatch && contentMatch && passengerMatch && conditionMatch;
        });

        console.log(`  找到 ${conditionDialogs.length} 个 ${condition} 条件的对话`);

        if (conditionDialogs.length > 0) {
            // 按优先级排序（优先级数字越小越优先）
            conditionDialogs.sort((a, b) => a.priority - b.priority);
            const selectedDialog = conditionDialogs[0];
            console.log(`✅ 选择条件对话: ID=${selectedDialog.id}, 优先级=${selectedDialog.priority}, 文本="${selectedDialog.dialog_text}"`);
            return selectedDialog;
        }

        console.log(`❌ 未找到 ${passenger.name} 的 ${condition} 条件对话`);
        return null;
    }

    /**
     * ✅ 触发条件对话 - 移除重复检查
     */
    triggerConditionDialog(dialog, passenger) {
        if (!this.dialogSystem) {
            console.warn('⚠️ 对话系统未初始化');
            return false;
        }

        console.log(`✅ 触发条件对话: ID=${dialog.id} "${dialog.dialog_text}"`);

        // ✅ 条件对话：不加入triggeredDialogs集合，直接触发
        // 这样可以确保每次条件满足都能显示

        // 触发对话
        this.dialogSystem.triggerDialog(dialog, null, passenger);

        return true;
    }

    /**
     * ✅ 检查并触发条件特定对话（靠窗、附近吃东西、同伴相邻等）
     */
    checkAndTriggerConditionDialogs(passenger, seat, isSatisfied) {
        console.log(`🔍 检查 ${passenger.name} 的特定条件对话...`);

        // 检查靠窗座位
        if (seat.isWindow === true) {
            console.log(`✅ ${passenger.name} 被放置到靠窗座位，寻找对应对话`);
            this.triggerConditionSpecificDialog(passenger, seat, 'window_seat');
        }

        // 检查附近是否有吃东西的乘客
        if (this.checkEatingNeighbor(seat.id)) {
            console.log(`⚠️ ${passenger.name} 附近有吃东西的乘客，寻找对应对话`);
            this.triggerConditionSpecificDialog(passenger, seat, 'near_eating');
        }

        // 检查是否与同伴相邻
        if (passenger.pairedWith) {
            const pairedPassenger = this.passengers.find(p => p.id === passenger.pairedWith);
            if (pairedPassenger && pairedPassenger.placed && pairedPassenger.seatId) {
                const isAdjacent = this.checkIfAdjacentSeats(passenger.seatId, pairedPassenger.seatId);
                if (isAdjacent) {
                    console.log(`❤️ ${passenger.name} 与同伴相邻，寻找对应对话`);
                    this.triggerConditionSpecificDialog(passenger, seat, 'paired_together');
                }
            }
        }
    }

    /**
     * ✅ 触发条件特定对话
     */
    triggerConditionSpecificDialog(passenger, seat, condition) {
        if (!this.dialogSystem) {
            console.warn('⚠️ 对话系统未初始化');
            return;
        }

        console.log(`🔍 在对话系统中查找 ${passenger.name} 的 ${condition} 对话`);

        // 查找条件特定对话
        const conditionDialogs = this.dialogSystem.dialogs.filter(dialog =>
            dialog.trigger_type === 'condition_specific' &&
            dialog.content_type === 'bubble' &&
            dialog.condition_passenger &&
            dialog.condition_passenger.toLowerCase() === passenger.name.toLowerCase() &&
            dialog.trigger_condition === condition
        );

        console.log(`  找到 ${conditionDialogs.length} 个 ${condition} 条件的对话`);

        if (conditionDialogs.length > 0) {
            // 选择第一个符合条件的对话
            const dialogToShow = conditionDialogs[0];
            console.log(`✅ 触发条件对话: ID=${dialogToShow.id} "${dialogToShow.dialog_text}"`);

            // 触发对话
            this.dialogSystem.triggerDialog(dialogToShow, null, passenger);
        } else {
            console.log(`  未找到 ${passenger.name} 的 ${condition} 条件对话`);
        }
    }

    /**
     * ✅ 触发乘客特定放置对话（来自dialogs.csv中seat_assigned类型）
     */
    triggerPassengerSpecificDialog(passenger, seat, isSatisfied) {
        if (!this.dialogSystem) {
            console.warn('⚠️ 对话系统未初始化');
            return;
        }

        console.log(`🔍 查找 ${passenger.name} 的特定放置对话`);

        // 查找乘客特定对话
        const passengerSpecificDialogs = this.dialogSystem.dialogs.filter(dialog =>
            dialog.trigger_type === 'seat_assigned' &&
            dialog.trigger_target === 'seat' &&
            dialog.condition_passenger &&
            dialog.condition_passenger.toLowerCase() === passenger.name.toLowerCase()
        );

        console.log(`  找到 ${passengerSpecificDialogs.length} 个乘客特定放置对话`);

        if (passengerSpecificDialogs.length > 0) {
            // 根据满意度选择合适的对话
            let dialogToShow = null;

            // 优先选择与满意度匹配的对话
            const moodSpecificDialogs = passengerSpecificDialogs.filter(dialog =>
                dialog.trigger_condition === (isSatisfied ? 'satisfied' : 'unsatisfied')
            );

            if (moodSpecificDialogs.length > 0) {
                dialogToShow = moodSpecificDialogs[0];
            } else {
                // 如果没有满意度匹配的，使用第一个找到的
                dialogToShow = passengerSpecificDialogs[0];
            }

            if (dialogToShow) {
                console.log(`✅ 触发乘客特定放置对话: ID=${dialogToShow.id} "${dialogToShow.dialog_text}"`);

                // 如果乘客不满意且生气图标存在，使用生气图标
                if (!isSatisfied && passenger.angryIcon && dialogToShow.character_emotion === 'angry') {
                    dialogToShow.icon = passenger.angryIcon;
                }

                this.dialogSystem.triggerDialog(dialogToShow, null, passenger);
            }
        }
    }

    /**
     * ✅ 触发通用满意/不满意对话（后备）
     */
    triggerGeneralSatisfactionDialog(passenger, seat, isSatisfied) {
        if (!this.dialogSystem) {
            console.warn('⚠️ 对话系统未初始化');
            return;
        }

        console.log(`🔍 查找通用${isSatisfied ? '满意' : '不满意'}对话`);

        const condition = isSatisfied ? 'satisfied' : 'unsatisfied';
        const generalDialogs = this.dialogSystem.dialogs.filter(dialog =>
            dialog.trigger_type === 'seat_assigned' &&
            dialog.trigger_target === 'seat' &&
            dialog.trigger_condition === condition &&
            (!dialog.condition_passenger || dialog.condition_passenger.trim() === '')
        );

        console.log(`  找到 ${generalDialogs.length} 个通用${condition}对话`);

        if (generalDialogs.length > 0) {
            const dialogToShow = generalDialogs[0];
            console.log(`📢 触发通用${condition}对话: "${dialogToShow.dialog_text}"`);

            // 如果乘客不满意且生气图标存在，使用生气图标
            if (!isSatisfied && passenger.angryIcon) {
                dialogToShow.icon = passenger.angryIcon;
                dialogToShow.character_emotion = 'angry';
            }

            this.dialogSystem.triggerDialog(dialogToShow, null, passenger);
        }
    }




    /**
     * ✅ 暂停游戏计时（用于系统提示对话期间）
     */
    pauseGameTimer() {
        console.log('⏸️ 暂停游戏计时');

        if (this.gameTimerInterval) {
            clearInterval(this.gameTimerInterval);
            this.gameTimerInterval = null;
        }

        this.isGameTimerPaused = true;
    }

    /**
     * 恢复游戏计时（系统提示结束后）
     */
    resumeGameTimer() {
        console.log('▶️ 恢复游戏计时');

        // ✅ 关键：如果游戏开始时间还是0，说明是第一次开始
        if (this.gameStartTime === 0) {
            this.gameStartTime = Date.now();
            console.log('⏱️ 游戏计时正式开始，开始时间:', new Date(this.gameStartTime).toLocaleTimeString());
        }

        this.isGameTimerPaused = false;

        // 启动计时器
        if (!this.gameTimerInterval) {
            this.startGameTimer();
        }
    }

    /**
     * 开始游戏计时（内部方法）
     */
    startGameTimer() {
        console.log('⏱️ 开始游戏计时循环');

        // 清除可能存在的旧计时器
        if (this.gameTimerInterval) {
            clearInterval(this.gameTimerInterval);
        }

        this.gameTimerInterval = setInterval(() => {
            if (!this.isGameTimerPaused) {
                const currentTime = Date.now();
                this.elapsedSeconds = Math.floor((currentTime - this.gameStartTime) / 1000);

                // 触发时间相关对话（只在特定时间点）
                this.triggerTimeBasedDialogs(this.elapsedSeconds);

                // 每10秒输出一次当前时间（用于调试）
                if (this.elapsedSeconds % 10 === 0 && this.elapsedSeconds > 0) {
                    console.log(`🕒 游戏进行时间: ${this.elapsedSeconds}秒`);
                }
            }
        }, 1000);
    }

    /**
      * ✅ 触发时间相关对话
      * @param {number} elapsedSeconds 已过时间（秒）
      */
    triggerTimeBasedDialogs(elapsedSeconds) {
        // ✅ 新增：游戏开始2秒后触发开场故事（郭嘉贾诩）
        // 只有当游戏计时器在走动（非暂停状态）时才会触发
        if (elapsedSeconds === 2) {
            console.log('⏰ 游戏时间2秒，尝试触发开场故事对话');
            if (this.dialogSystem) {
                this.dialogSystem.triggerGameStartStoryDialogs();
            }
        }

        // 示例：30秒触发对话

        // 示例：30秒触发对话
        if (elapsedSeconds === 30) {
            console.log('⏰ 触发30秒时间对话');
            if (this.dialogSystem && this.dialogSystem.triggerConditionDialogs) {
                this.dialogSystem.triggerConditionDialogs('timer_30s', 'global');
            }
        }

        // 示例：60秒触发对话
        if (elapsedSeconds === 60) {
            console.log('⏰ 触发60秒时间对话');
            if (this.dialogSystem && this.dialogSystem.triggerConditionDialogs) {
                this.dialogSystem.triggerConditionDialogs('timer_60s', 'global');
            }
        }
    }

    /**
     * ✅ 获取当前游戏时间（秒）
     * @returns {number} 游戏进行时间（秒）
     */
    getCurrentGameTime() {
        if (this.gameStartTime === 0 || this.isGameTimerPaused) {
            return 0;
        }
        return Math.floor((Date.now() - this.gameStartTime) / 1000);
    }

    /**
     * ✅ 停止游戏计时（游戏结束时调用）
     */
    stopGameTimer() {
        console.log('⏹️ 停止游戏计时');

        if (this.gameTimerInterval) {
            clearInterval(this.gameTimerInterval);
            this.gameTimerInterval = null;
        }

        this.isGameTimerPaused = true;
    }


    /**
     * 触发条件对话系统（整合原来的 triggerPassengerPlacedDialog 和特殊条件检查）
     */
    /**
    * 触发乘客放置对话（完全重写版）
    * @param {Object} passenger 乘客对象
    * @param {Object} seat 座位对象
    */
    /**
     * 触发乘客放置对话 - 修复中文字符匹配问题
     */
    triggerPassengerPlacedDialog(passenger, seat) {
        console.log(`📢 ======== 触发乘客放置对话 ========`);
        console.log(`乘客: "${passenger.name}", 座位: ${seat.id}`);

        // ✅ 关键：清理乘客名字（去除所有空白和不可见字符）
        const cleanPassengerName = this.cleanString(passenger.name);
        console.log(`清理后的乘客名: "${cleanPassengerName}"`);

        // 检查满意度
        const isSatisfied = this.game.checkPassengerSatisfaction(passenger);
        console.log(`满意度: ${isSatisfied}`);

        // 1. 先查找并触发条件特定对话（靠窗、同伴等）
        this.triggerConditionSpecificDialogs(cleanPassengerName, passenger, seat, isSatisfied);

        // 2. 如果没有任何对话触发，使用通用对话
        setTimeout(() => {
            if (!this.wasDialogTriggered) {
                console.log('🔄 没有触发特定对话，使用通用对话');
                this.triggerGenericSatisfactionDialog(passenger, seat, isSatisfied);
            }
            this.wasDialogTriggered = false; // 重置标志
        }, 100);
    }

    /**
     * 清理字符串（去除所有空白和特殊字符）
     */
    cleanString(str) {
        if (!str) return '';
        // 1. 去除首尾空白
        // 2. 替换所有空白字符（包括全角空格）
        // 3. 转换为小写（如果需要）
        return str.trim()
            .replace(/\s+/g, '')  // 去除所有空白字符
            .replace(/[\u3000]/g, '')  // 去除全角空格
            .toLowerCase();
    }

    /**
     * 触发条件特定对话
     */
    triggerConditionSpecificDialogs(cleanPassengerName, passenger, seat, isSatisfied) {
        console.log(`🔍 查找条件对话 for "${cleanPassengerName}"`);

        // 查找所有条件对话
        const conditionDialogs = this.dialogs.filter(dialog =>
            dialog.trigger_type === 'condition_specific'
        );

        console.log(`找到 ${conditionDialogs.length} 个条件对话`);

        conditionDialogs.forEach(dialog => {
            if (!dialog.condition_passenger) return;

            // 清理对话中的乘客名
            const cleanDialogPassengerName = this.cleanString(dialog.condition_passenger);
            console.log(`  对话 ${dialog.id}: 条件乘客="${cleanDialogPassengerName}", 条件=${dialog.trigger_condition}`);

            // 检查是否匹配
            if (cleanDialogPassengerName === cleanPassengerName) {
                console.log(`  ✅ 乘客名匹配!`);

                // 检查条件是否满足
                const conditionMet = this.checkIfConditionMet(dialog.trigger_condition, passenger, seat);

                if (conditionMet) {
                    console.log(`  🎯 条件满足! 触发对话: "${dialog.dialog_text}"`);
                    this.wasDialogTriggered = true;

                    // 如果有图标，使用乘客的图标
                    const dialogToShow = { ...dialog };
                    if (passenger.icon && !dialogToShow.icon) {
                        dialogToShow.icon = passenger.icon;
                    }

                    this.triggerDialog(dialogToShow, null, passenger);
                }
            }
        });
    }

    /**
     * 检查条件是否满足
     */
    checkIfConditionMet(condition, passenger, seat) {
        switch (condition) {
            case 'window_seat':
                const isWindow = seat.isWindow === true;
                console.log(`  🪟 检查靠窗: seat.isWindow=${seat.isWindow}, 结果=${isWindow}`);
                return isWindow;

            case 'near_eating':
                const hasEatingNeighbor = this.checkEatingPassengerNearby(seat);
                console.log(`  🍱 检查附近吃东西: ${hasEatingNeighbor}`);
                return hasEatingNeighbor;

            case 'paired_together':
                if (passenger.pairedWith) {
                    const pairedPassenger = this.game.passengers.find(p => p.id === passenger.pairedWith);
                    const isAdjacent = pairedPassenger && pairedPassenger.placed &&
                        this.game.checkIfAdjacentSeats(passenger.seatId, pairedPassenger.seatId);
                    console.log(`  👥 检查同伴相邻: ${isAdjacent}`);
                    return isAdjacent;
                }
                return false;

            case 'timer':
                // 时间条件在别处处理
                return false;

            default:
                return false;
        }
    }

    /**
     * 触发通用满意度对话
     */
    triggerGenericSatisfactionDialog(passenger, seat, isSatisfied) {
        const condition = isSatisfied ? 'satisfied' : 'unsatisfied';

        console.log(`🔍 查找通用${condition}对话`);

        const genericDialogs = this.dialogs.filter(dialog =>
            dialog.trigger_type === 'seat_assigned' &&
            dialog.trigger_target === 'seat' &&
            dialog.trigger_condition === condition
        );

        console.log(`找到 ${genericDialogs.length} 个通用${condition}对话`);

        if (genericDialogs.length > 0) {
            genericDialogs.sort((a, b) => a.priority - b.priority);
            const dialog = genericDialogs[0];

            // 使用乘客的图标
            const dialogToShow = { ...dialog };
            if (passenger.icon && !dialogToShow.icon) {
                dialogToShow.icon = isSatisfied ? passenger.icon : (passenger.angryIcon || passenger.icon);
            }

            console.log(`💬 触发通用对话: "${dialogToShow.dialog_text}"`);
            this.triggerDialog(dialogToShow, null, passenger);
        }
    }





    /**
     * 检查特殊条件并触发对应对话
     */
    checkSpecialConditionDialogs(passenger, seat) {
        // 检查是否是靠窗座位
        if (seat.isWindow === true) {
            console.log(`✅ ${passenger.name} 被放置到靠窗座位，触发条件对话`);
            if (this.dialogSystem.conditionSystem) {
                this.dialogSystem.conditionSystem.checkAndTriggerCondition('window_seat', {
                    passenger,
                    seat
                });
            }
        }

        // 检查附近是否有吃东西的乘客
        if (this.checkEatingNeighbor(seat.id)) {
            console.log(`⚠️ ${passenger.name} 附近有吃东西的乘客，触发条件对话`);
            if (this.dialogSystem.conditionSystem) {
                this.dialogSystem.conditionSystem.checkAndTriggerCondition('near_eating', {
                    passenger,
                    seat
                });
            }
        }

        // 检查是否与同伴相邻
        if (passenger.pairedWith) {
            const pairedPassenger = this.passengers.find(p => p.id === passenger.pairedWith);
            if (pairedPassenger && pairedPassenger.placed && pairedPassenger.seatId) {
                const isAdjacent = this.checkIfAdjacentSeats(passenger.seatId, pairedPassenger.seatId);
                if (isAdjacent) {
                    console.log(`❤️ ${passenger.name} 与同伴相邻，触发条件对话`);
                    if (this.dialogSystem.conditionSystem) {
                        this.dialogSystem.conditionSystem.checkAndTriggerCondition('paired_together', {
                            passenger,
                            pairedPassenger
                        });
                    }
                }
            }
        }
    }

    // ✅ 保留原有的 showChatBubble 方法，但需要区分自然聊天和条件对话
    // 在 showChatBubble 方法开头添加：
    showChatBubble(passenger) {
        // 添加标记，区分这是自然聊天
        const isNaturalChat = true;

        if (!passenger.placed || !passenger.seatId) return;

        const passengerElement = document.querySelector(`.passenger-on-seat[data-passenger-id="${passenger.id}"]`);
        if (!passengerElement) return;

        // 清除现有的自然聊天气泡（保留条件对话气泡）
        const existingNaturalBubble = passengerElement.querySelector('.natural-chat-bubble');
        if (existingNaturalBubble) {
            existingNaturalBubble.remove();
        }

        // 创建聊天气泡，添加特殊类名
        const chatBubble = document.createElement('div');
        chatBubble.className = 'natural-chat-bubble'; // 添加这个类名
        chatBubble.dataset.passengerId = passenger.id;
        chatBubble.dataset.chatType = 'natural'; // 标记为自然聊天
        chatBubble.textContent = passenger.seatChatContent;

        // ✅ 这里缺少了实际的样式设置！需要添加：
        // 设置样式
        chatBubble.style.position = 'absolute';
        chatBubble.style.bottom = '100%';
        chatBubble.style.left = '50%';
        chatBubble.style.transform = 'translateX(-50%)';
        chatBubble.style.backgroundColor = 'rgba(50, 50, 50, 0.95)';
        chatBubble.style.color = 'white';
        chatBubble.style.padding = '8px 12px';
        chatBubble.style.borderRadius = '10px';
        chatBubble.style.fontSize = '14px';
        chatBubble.style.whiteSpace = 'nowrap';
        chatBubble.style.zIndex = '1000'; // 比条件对话低
        chatBubble.style.pointerEvents = 'none';
        chatBubble.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
        chatBubble.style.border = '1px solid rgba(255, 255, 255, 0.2)';

        // 添加小三角
        const triangle = document.createElement('div');
        triangle.style.position = 'absolute';
        triangle.style.top = '100%';
        triangle.style.left = '50%';
        triangle.style.transform = 'translateX(-50%)';
        triangle.style.width = '0';
        triangle.style.height = '0';
        triangle.style.borderLeft = '6px solid transparent';
        triangle.style.borderRight = '6px solid transparent';
        triangle.style.borderTop = '6px solid rgba(50, 50, 50, 0.95)';

        chatBubble.appendChild(triangle);
        passengerElement.appendChild(chatBubble);


        // 保存引用
        this.chatBubbles.set(passenger.id, chatBubble);

        console.log(`💬 显示自然聊天气泡: ${passenger.name} - "${passenger.seatChatContent}"`);
    }

    /**
     * 从座位移除乘客
     * @param {number} passengerId 乘客ID
     * @param {boolean} updateCount 是否更新计数（默认为true）
     */
    removePassengerFromSeat(passengerId, updateCount = true) {
        const passenger = this.passengers.find(p => p.id === passengerId);
        if (!passenger) return;

        console.log(`从座位移除乘客: ${passenger.name}, 原本在座位: ${passenger.seatId}, placed状态: ${passenger.placed}`);

        // 只有在乘客确实在座位上时才执行移除操作
        if (passenger.placed && passenger.seatId) {
            // 更新座位状态
            const seat = this.seats.find(s => s.id === passenger.seatId);
            if (seat) {
                seat.occupied = false;
                seat.passengerId = null;
                if (seat.element) {
                    seat.element.classList.remove('occupied');
                }
            }

            // 更新乘客状态
            passenger.placed = false;
            passenger.seatId = null;

            // 从显示区域移除
            this.removePassengerFromDisplay(passengerId);

            // 更新计数（只有在不是交换过程中的临时移除时才更新）
            if (updateCount) {
                this.placedCount--;
                this.updateUI();

                // 更新满意度显示（因为乘客离开座位，满意度可能变化）
                this.updateSatisfactionDisplay();
            }
        }

        // 无论乘客是否在座位上，都确保乘客元素正确更新
        if (passenger.element) {
            passenger.element.classList.remove('placed');
            // 注意：不设置display为block，因为如果乘客被选中，应该跟随鼠标
            // 只有在clearSelection且returnToWaitingArea=true时才显示在等候区
        }
    }

    /**
     * 从显示区域移除乘客
     * @param {number} passengerId 乘客ID
     */
    removePassengerFromDisplay(passengerId) {
        const displayArea = document.getElementById('passenger-display');
        if (!displayArea) return;

        // 查找并移除所有具有这个 passengerId 的乘客元素
        const passengerElements = displayArea.querySelectorAll(`[data-passenger-id="${passengerId}"]`);

        console.log(`🔍 找到 ${passengerElements.length} 个乘客ID=${passengerId} 的元素`);

        passengerElements.forEach(element => {
            console.log(`  移除乘客元素:`, element);
            element.remove();
        });
    }

    /**
     * 更新乘客满意度
     * @param {Object} passenger 乘客对象
     */
    updatePassengerSatisfaction(passenger) {
        // 检查乘客是否满意
        const isSatisfied = this.checkPassengerSatisfaction(passenger);
        passenger.satisfied = isSatisfied;
        passenger.isAngry = !isSatisfied;

        // 根据心情更新图标路径
        if (passenger.isAngry) {
            passenger.currentIcon = passenger.angryIcon || passenger.icon;
        } else {
            passenger.currentIcon = passenger.icon;
        }

        console.log(`${passenger.name} 心情更新:`, {
            satisfied: passenger.satisfied,
            isAngry: passenger.isAngry,
            currentIcon: passenger.currentIcon
        });

        // 强制更新所有相关元素的图标
        this.updatePassengerIcon(passenger);

        // 更新满意度显示
        this.updateSatisfactionDisplay();
    }

    /**
     * 更新乘客图标显示（强制刷新）
     * @param {Object} passenger 乘客对象
     */
    updatePassengerIcon(passenger) {
        console.log(`🔄 强制更新 ${passenger.name} 的图标为: ${passenger.currentIcon}`);

        // 1. 更新等候区乘客图标
        if (passenger.element && !passenger.placed) {
            const img = passenger.element.querySelector('img');
            if (img) {
                img.src = passenger.currentIcon;
                console.log(`  ✅ 更新等候区图标`);
            }
        }

        // 2. 更新座位上乘客图标
        const passengerOnSeat = document.querySelector(`.passenger-on-seat[data-passenger-id="${passenger.id}"]`);
        if (passengerOnSeat) {
            const img = passengerOnSeat.querySelector('img');
            if (img) {
                img.src = passenger.currentIcon;
                console.log(`  ✅ 更新座位上图标`);
            }
        }

        // 3. 更新选中乘客跟随图标
        if (this.selectedPassenger && this.selectedPassenger.id === passenger.id) {
            const followingImg = this.followingPassenger.querySelector('img');
            if (followingImg) {
                followingImg.src = passenger.currentIcon;
                console.log(`  ✅ 更新跟随图标`);
            }
        }

        // 4. 强制清除图片缓存（某些浏览器需要）
        const timestamp = new Date().getTime();
        if (passenger.element && !passenger.placed) {
            const img = passenger.element.querySelector('img');
            if (img && img.src === passenger.currentIcon) {
                img.src = passenger.currentIcon + '?t=' + timestamp;
            }
        }

        const passengerOnSeat2 = document.querySelector(`.passenger-on-seat[data-passenger-id="${passenger.id}"]`);
        if (passengerOnSeat2) {
            const img = passengerOnSeat2.querySelector('img');
            if (img && img.src === passenger.currentIcon) {
                img.src = passenger.currentIcon + '?t=' + timestamp;
            }
        }
    }

    /**
     * 在座位上添加乘客显示
     * @param {Object} passenger 乘客对象
     * @param {Object} seat 座位对象
     */
    addPassengerToSeat(passenger, seat) {
        const displayArea = document.getElementById('passenger-display');
        const seatElement = seat.element;

        if (!seatElement) {
            console.error('座位元素不存在');
            return;
        }

        // ===== 强制清理：移除这个乘客的所有旧元素 =====
        const oldElements = displayArea.querySelectorAll(`[data-passenger-id="${passenger.id}"]`);
        if (oldElements.length > 0) {
            console.log(`⚠️ 发现 ${oldElements.length} 个重复的乘客ID=${passenger.id}，正在清理...`);
            oldElements.forEach(el => el.remove());
        }
        // ============================================

        // 创建乘客显示元素
        const passengerElement = document.createElement('div');
        passengerElement.className = 'passenger-on-seat';
        passengerElement.dataset.passengerId = passenger.id;
        passengerElement.dataset.seatId = seat.id;

        passengerElement.style.overflow = 'visible';
        passengerElement.style.border = 'none';
        passengerElement.style.background = 'transparent';
        passengerElement.style.boxShadow = 'none';
        passengerElement.style.outline = 'none';

        if (passenger.icon) {
            const img = document.createElement('img');
            img.src = passenger.icon;
            img.alt = passenger.name;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.borderRadius = '8px';
            img.style.objectFit = 'cover';
            img.style.border = 'none';
            img.style.background = 'transparent';
            passengerElement.appendChild(img);
        }

        // 先添加到displayArea
        displayArea.appendChild(passengerElement);

        // 然后再定位乘客到座位中心
        this.positionPassengerSimple(passengerElement, seatElement);

        // ... 事件监听代码保持不变 ...
        // 在 addPassengerToSeat 方法的末尾，return 之前添加：
        // 延迟一点重新计算所有乘客位置，确保新添加的不影响已有的
        setTimeout(() => {
            this.repositionAllPassengers();
        }, 10);
    }
    /**
     * 重新定位所有已放置的乘客（修复累积偏移）
     */
    repositionAllPassengers() {
        console.log('🔄 重新定位所有已放置乘客');

        this.passengers.forEach(p => {
            if (p.placed && p.seatId) {
                const passengerEl = document.querySelector(`.passenger-on-seat[data-passenger-id="${p.id}"]`);
                const seat = this.seats.find(s => s.id === p.seatId);

                if (passengerEl && seat && seat.element) {
                    // 重新定位
                    this.positionPassengerSimple(passengerEl, seat.element);
                }
            }
        });
    }
    /**
     * 定位乘客到座位中心（使用 getBoundingClientRect，确保无累积偏移）
     * @param {HTMLElement} passengerElement 乘客元素
     * @param {HTMLElement} seatElement 座位元素
     */
    positionPassengerSimple(passengerElement, seatElement) {
        // 获取passenger-display容器（乘客元素的父容器）
        const displayArea = document.getElementById('passenger-display');
        const displayAreaRect = displayArea.getBoundingClientRect();

        // 获取座位元素相对于视口的位置
        const seatRect = seatElement.getBoundingClientRect();

        // 计算座位中心点相对于视口的位置
        const seatCenterX = seatRect.left + seatRect.width / 2;
        const seatCenterY = seatRect.top + seatRect.height / 2;

        // 转换为相对于passenger-display容器的坐标
        const relativeX = seatCenterX - displayAreaRect.left;
        const relativeY = seatCenterY - displayAreaRect.top;

        console.log(`座位ID: ${seatElement.dataset.seatId} 定位:`, {
            seatRect: { left: seatRect.left, top: seatRect.top },
            displayAreaRect: { left: displayAreaRect.left, top: displayAreaRect.top },
            relativeX,
            relativeY,
            seatCenterY,
            displayTop: displayAreaRect.top
        });

        // 设置位置 - 使用 transform 将元素中心点移到计算出的坐标
        passengerElement.style.setProperty('position', 'absolute', 'important');
        passengerElement.style.setProperty('left', `${relativeX}px`, 'important');
        passengerElement.style.setProperty('top', `${relativeY}px`, 'important');
        passengerElement.style.setProperty('transform', 'translate(-50%, -50%)', 'important');
    }

    /**
     * 显示乘客需求卡
     * @param {Object|number} passenger 乘客对象或ID
     * @param {boolean} isSelected 是否为选中状态
     */
    showPassengerDemand(passenger, isSelected = false) {
        // 如果传入的是ID，则查找乘客对象
        if (typeof passenger === 'number') {
            passenger = this.passengers.find(p => p.id === passenger);
        }

        if (!passenger) return;

        // 关键修改3：如果有选中的乘客，强制显示选中乘客的需求卡
        if (this.selectedPassenger && !isSelected) {
            console.log(`有选中乘客 ${this.selectedPassenger.name}，优先显示选中乘客需求卡`);
            passenger = this.selectedPassenger; // 强制显示选中乘客信息
        }

        console.log(`显示需求卡: ${passenger.name} (选中: ${isSelected})`);

        const requirementCard = document.getElementById('requirement-card');
        const nameElement = document.getElementById('requirement-name');
        const contentElement = document.getElementById('requirement-content');

        if (requirementCard && nameElement && contentElement) {
            // 显示乘客信息
            nameElement.textContent = passenger.name;

            let demandText = passenger.description;
            if (!demandText && passenger.preferences) {
                demandText = passenger.preferences.join("，");
            }
            contentElement.textContent = demandText || "暂无要求";

            // 显示卡片
            requirementCard.classList.add('show');

            // 关键修改4：只有没有选中乘客时才设置自动隐藏
            if (!this.selectedPassenger || this.selectedPassenger.id !== passenger.id) {
                this.clearTooltipTimer();
                this.tooltipTimer = setTimeout(() => {
                    if (!this.currentHoveredPassenger || this.currentHoveredPassenger !== passenger.id) {
                        this.hidePassengerDemand();
                    }
                }, 5000);
            }
        }
    }

    /**
     * 隐藏乘客需求卡
     */
    hidePassengerDemand() {
        // 关键修改5：如果当前有选中的乘客，不隐藏需求卡
        if (this.selectedPassenger) {
            console.log('有选中乘客，不隐藏需求卡');
            return;
        }

        const requirementCard = document.getElementById('requirement-card');
        if (requirementCard) {
            requirementCard.classList.remove('show');
        }
        this.clearTooltipTimer();
    }

    /**
     * 清除需求卡计时器
     */
    clearTooltipTimer() {
        if (this.tooltipTimer) {
            clearTimeout(this.tooltipTimer);
            this.tooltipTimer = null;
        }
    }

    /**
     * 处理鼠标移动（修复版）
     * @param {MouseEvent} e 鼠标事件
     */
    handleMouseMove(e) {
        // ✅ 关键修复：只有有选中的乘客并且isDragging为true时才跟随
        if (this.isDragging && this.selectedPassenger && this.followingPassenger) {
            // 更新跟随元素位置
            const x = e.clientX - this.dragOffsetX;
            const y = e.clientY - this.dragOffsetY;

            this.followingPassenger.style.left = `${x}px`;
            this.followingPassenger.style.top = `${y}px`;
            this.followingPassenger.style.display = 'block';
            this.followingPassenger.classList.add('show');
        }
    }

    /**
    * 清除选择状态（修复版）
    * @param {boolean} returnToWaitingArea 是否将乘客放回等候区（默认为false）
    */
    clearSelection(returnToWaitingArea = false) {
        console.log('清除选择状态', returnToWaitingArea ? '（放回等候区）' : '');

        // ✅ 关键修复：立即停止拖拽和隐藏跟随元素
        this.isDragging = false;

        // 隐藏跟随鼠标的乘客元素
        if (this.followingPassenger) {
            this.followingPassenger.classList.remove('show');
            this.followingPassenger.style.display = 'none';
        }

        // 如果要将选中乘客放回等候区
        if (returnToWaitingArea && this.selectedPassenger) {
            const passenger = this.selectedPassenger;

            // 如果乘客原本在座位上，需要从座位移除
            if (passenger.placed && passenger.seatId) {
                console.log(`将乘客 ${passenger.name} 从座位放回等候区`);
                this.removePassengerFromSeat(passenger.id);
            }

            // 重置乘客到等候区
            passenger.placed = false;
            passenger.seatId = null;

            if (passenger.element) {
                // 关键修改：放回等候区时显示图标
                passenger.element.style.display = 'block';
                passenger.element.style.left = `${passenger.startX}px`;
                passenger.element.style.top = `${passenger.startY}px`;
                passenger.element.classList.remove('placed');
                passenger.element.classList.remove('selected');
                passenger.element.style.cursor = 'grab';
            }
        } else if (this.selectedPassenger) {
            // 如果不是放回等候区，只是取消选择
            const passenger = this.selectedPassenger;

            if (passenger.element) {
                // 关键修复：根据乘客当前位置决定是否显示图标
                if (passenger.placed) {
                    // 如果乘客在座位上，不显示等候区图标
                    passenger.element.style.display = 'none';
                    passenger.element.classList.remove('selected');
                } else {
                    // 如果乘客在等候区，显示图标
                    passenger.element.style.display = 'block';
                    passenger.element.style.left = `${passenger.startX}px`;
                    passenger.element.style.top = `${passenger.startY}px`;
                    passenger.element.classList.remove('selected');
                    passenger.element.style.cursor = 'grab';
                }
            }
        }

        this.selectedPassenger = null;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;

        // 如果没有悬停的乘客，隐藏需求卡
        if (!this.currentHoveredPassenger) {
            this.hidePassengerDemand();
        }
    }

    /**
     * 更新UI显示
     */
    updateUI() {
        // 更新已安排乘客数
        const placedCountElement = document.getElementById('placed-count');
        if (placedCountElement) {
            placedCountElement.textContent = `已安排: ${this.placedCount}/${this.totalPassengers}`;
        }

        // 更新剩余乘客数（如果存在该元素）
        const remainingCountElement = document.getElementById('remaining-count');
        if (remainingCountElement) {
            const remaining = this.totalPassengers - this.placedCount;
            remainingCountElement.textContent = remaining;
        }
    }

    /**
     * 切换暂停状态
     */
    togglePause() {
        this.isPaused = !this.isPaused;
        const modal = document.getElementById('pause-modal');

        if (this.isPaused) {
            modal.style.display = 'flex';
            console.log('游戏已暂停');

            // 暂停时清理对话
            if (this.dialogSystem) {
                this.dialogSystem.cleanup();
            }
        } else {
            modal.style.display = 'none';
            console.log('游戏继续');
        }
    }

    /**
     * 重新开始游戏（使用美观弹窗）
     */
    async restartGame() {
        // 显示自定义重新开始确认弹窗
        const shouldRestart = await this.showRestartConfirmModal();
        if (shouldRestart) {
            // 停止游戏计时
            this.stopGameTimer();

            // 重置游戏计时状态
            this.gameStartTime = 0;
            this.elapsedSeconds = 0;
            this.isGameTimerPaused = true;

            // 重置对话系统
            if (this.dialogSystem) {
                this.dialogSystem.reset();
            }
            location.reload();
        }
    }


    /**
     * 返回主页
     */
    returnToHome() {
        window.location.href = 'index.html';
    }

    /**
     * 检查游戏是否完成
     */
    checkGameComplete() {
        if (this.placedCount === this.totalPassengers) {
            console.log('所有乘客已安排完毕，游戏完成！');

            // 计算满意度
            this.calculateSatisfaction();

            // 触发所有乘客就座对话
            if (this.dialogSystem) {
                this.dialogSystem.triggerAllPassengersSeatedDialog();
            }

            // ✅ 修复：移除自动弹出的confirm弹窗
            // 玩家现在可以自主点击发车按钮来结束游戏
            console.log('🎉 所有乘客已安排完毕！请点击发车按钮查看结果');

            // // 可选：给发车按钮添加一些视觉提示
            // const departButton = document.getElementById('depart-button');
            // if (departButton) {
            //     departButton.style.animation = 'pulse 1.5s infinite';
            //     departButton.style.boxShadow = '0 0 15px rgba(224, 108, 93, 0.8)';

        }
    }

    /**
     * 计算满意度
     */
    calculateSatisfaction() {
        let satisfiedCount = 0;
        this.passengers.forEach(passenger => {
            if (passenger.placed) {
                const isSatisfied = this.checkPassengerSatisfaction(passenger);
                passenger.satisfied = isSatisfied;
                if (isSatisfied) satisfiedCount++;
            }
        });
        this.satisfiedCount = satisfiedCount;
        this.score = Math.floor((satisfiedCount / this.totalPassengers) * 100);
        return satisfiedCount;
    }

    /**
     * 检查乘客是否满意（支持多个需求）
     */
    checkPassengerSatisfaction(passenger) {
        // 如果没有任何要求，自动满意
        if (!passenger.preferences || passenger.preferences.length === 0) {
            console.log(`${passenger.name}: 无任何要求，自动满意`);
            return true;
        }

        // 如果要求是"无"，也自动满意
        if (passenger.preferences.length === 1 &&
            (passenger.preferences[0] === "无" || passenger.preferences[0].trim() === "")) {
            console.log(`${passenger.name}: 要求为"无"，自动满意`);
            return true;
        }

        // 获取座位信息
        const seat = this.seats.find(s => s.id === passenger.seatId);
        if (!seat) {
            console.log(`${passenger.name}: 未找到座位，不满意`);
            return false;
        }

        // ⚠️ 关键修改：检查所有需求
        console.log(`${passenger.name}: 开始检查${passenger.preferences.length}个需求`);

        let allSatisfied = true;
        const unsatisfiedReasons = [];

        for (const preference of passenger.preferences) {
            const isSatisfied = this.checkSinglePreference(passenger, seat, preference);

            if (!isSatisfied) {
                allSatisfied = false;
                unsatisfiedReasons.push(preference);
            }
        }

        if (!allSatisfied) {
            console.log(`${passenger.name}: 有以下需求未满足: ${unsatisfiedReasons.join(', ')}`);
        } else {
            console.log(`${passenger.name}: 所有需求都满足`);
        }

        return allSatisfied;
    }

    /**
     * 检查单个需求是否满足
     * @param {Object} passenger 乘客对象
     * @param {Object} seat 座位对象
     * @param {string} preference 具体需求
     * @returns {boolean} 是否满足
     */
    checkSinglePreference(passenger, seat, preference) {
        switch (preference) {
            case "吃东西":
                // 吃东西的乘客可以坐在任何位置
                console.log(`${passenger.name}: 吃东西乘客，需求满足`);
                return true;

            case "要求同伴":
                if (passenger.pairedWith) {
                    const pairedPassenger = this.passengers.find(p => p.id === passenger.pairedWith);
                    if (pairedPassenger && pairedPassenger.placed && pairedPassenger.seatId) {
                        const isAdjacent = this.checkIfAdjacentSeats(passenger.seatId, pairedPassenger.seatId);
                        if (isAdjacent) {
                            console.log(`${passenger.name}: 与同伴相邻，需求满足`);
                            return true;
                        } else {
                            console.log(`${passenger.name}: 与同伴不相邻，需求不满足`);
                            return false;
                        }
                    } else {
                        console.log(`${passenger.name}: 同伴未上车，需求不满足`);
                        return false;
                    }
                }
                // 如果没有指定同伴，这个需求就自动满足
                console.log(`${passenger.name}: 未指定具体同伴，需求自动满足`);
                return true;

            case "不喜欢味道":
                const hasEatingNeighbor = this.checkEatingNeighbor(passenger.seatId);
                if (hasEatingNeighbor) {
                    console.log(`${passenger.name}: 邻座有吃东西的乘客，需求不满足`);
                    return false;
                } else {
                    console.log(`${passenger.name}: 没有异味，需求满足`);
                    return true;
                }

            case "不能和某人做一起":
                // 暂时没有具体实现，默认满意
                console.log(`${passenger.name}: "不能和某人坐一起"需求，暂定满意`);
                return true;

            case "必须站立":
                if (seat.type === 'standing') {
                    console.log(`${passenger.name}: 被安排在站位，需求满足`);
                    return true;
                } else {
                    console.log(`${passenger.name}: 被安排在座位，需求不满足`);
                    return false;
                }

            case "要求位置":  // ⚠️ 保留原有的复杂逻辑
                return this.checkPositionRequirement(passenger, seat);

            // ⚠️ 新增：具体位置需求（和checkPositionRequirement中的判断互补）
            case "靠窗":
                return seat.isWindow === true;

            case "靠过道":
                return seat.isWindow === false && seat.type === 'seat';

            case "前排":
                return seat.id <= 9; // 假设1-9是前排

            case "后排":
                return seat.id >= 13; // 假设13-16是后排

            case "单人座":
                return seat.id <= 4; // 1-4是单人座

            case "双人座":
                return seat.id >= 5 && seat.id <= 16; // 5-16是双人座

            case "安静位置":
                // 检查周围座位是否空着
                const adjacentSeats = this.getAdjacentSeatIds(seat.id);
                const occupiedAdjacent = adjacentSeats.some(adjSeatId => {
                    const adjSeat = this.seats.find(s => s.id === adjSeatId);
                    return adjSeat && adjSeat.occupied;
                });
                return !occupiedAdjacent;

            default:
                console.log(`${passenger.name}: 未知要求 "${preference}"，默认满足`);
                return true;
        }
    }

    /**
     * 触发乘客放置对话（简化版）
     */
    triggerDialogForPassenger(passenger, seat) {
        console.log(`🎭 为 ${passenger.name} 触发对话，座位 ${seat.id}`);

        // 只调用对话系统的方法
        if (this.dialogSystem && this.dialogSystem.triggerPassengerPlacedDialog) {
            this.dialogSystem.triggerPassengerPlacedDialog(passenger, seat);
        }
        // ✅ 不再触发自然聊天
    }

    /**
     * 统一处理乘客放置后的对话（核心修复方法）
     * @param {Object} passenger 乘客对象
     * @param {Object} seat 座位对象
     */
    handlePassengerPlacedDialogs(passenger, seat) {
        console.log(`🎭 处理乘客放置对话: ${passenger.name} -> 座位 ${seat.id}`);

        // 1. 先更新乘客满意度状态
        const wasSatisfied = passenger.satisfied;
        this.updatePassengerSatisfaction(passenger);
        const isSatisfied = passenger.satisfied;

        console.log(`  满意度: ${wasSatisfied} → ${isSatisfied}`);

        // 2. 延迟一点时间，确保UI更新完成
        setTimeout(() => {
            // 3. 触发对话系统的座位放置对话（来自dialogs.csv）
            this.triggerDialogSystemDialogs(passenger, seat, isSatisfied);

            // 4. 触发自然聊天（来自乘客CSV，延迟更久一些）
            setTimeout(() => {
                this.triggerNaturalChat(passenger);
            }, 1000); // 1秒后显示自然聊天
        }, 300);
    }

    /**
     * 触发对话系统的各种对话（来自dialogs.csv）
     */
    triggerDialogSystemDialogs(passenger, seat, isSatisfied) {
        if (!this.dialogSystem) {
            console.warn('⚠️ 对话系统未初始化');
            return;
        }

        console.log(`🎭 触发对话系统对话: ${passenger.name}`);

        // A. 触发通用满意/不满意对话（优先级最低）
        const condition = isSatisfied ? 'satisfied' : 'unsatisfied';
        const generalDialogs = this.dialogSystem.getDialogsByTrigger('seat_assigned', 'seat', condition);

        generalDialogs.forEach(dialog => {
            // 只触发没有特定乘客条件的通用对话
            if (!dialog.condition_passenger || dialog.condition_passenger.trim() === '') {
                console.log(`  触发通用${condition}对话: "${dialog.dialog_text}"`);
                if (!this.dialogSystem.triggeredDialogs.has(dialog.id)) {
                    this.dialogSystem.triggerDialog(dialog, null, passenger);
                }
            }
        });

        // B. 触发乘客特定对话（优先级中等）
        const passengerSpecificDialogs = this.dialogSystem.dialogs.filter(dialog =>
            dialog.trigger_type === 'seat_assigned' &&
            dialog.trigger_target === 'seat' &&
            dialog.condition_passenger &&
            dialog.condition_passenger.toLowerCase() === passenger.name.toLowerCase()
        );

        if (passengerSpecificDialogs.length > 0) {
            console.log(`  找到 ${passenger.name} 的特定对话: ${passengerSpecificDialogs.length} 条`);
            passengerSpecificDialogs.forEach(dialog => {
                if (!this.dialogSystem.triggeredDialogs.has(dialog.id)) {
                    this.dialogSystem.triggerDialog(dialog, null, passenger);
                }
            });
        }

        // C. 触发条件系统特殊对话（优先级最高）
        this.checkSpecialConditionDialogs(passenger, seat);
    }

    /**
     * 触发自然聊天（乘客CSV中的对话）
     */
    triggerNaturalChat(passenger) {
        console.log(`💬 触发自然聊天: ${passenger.name}`);

        if (!passenger.seatChatContent || passenger.seatChatContent.trim() === "") {
            console.log(`  ${passenger.name} 没有自然聊天内容`);
            return;
        }

        // 清除之前的自然聊天气泡
        this.removeChatBubble(passenger.id);

        // 创建自然聊天气泡
        setTimeout(() => {
            this.showNaturalChatBubble(passenger);

            // 5秒后自动隐藏
            this.chatTimers.set(passenger.id, setTimeout(() => {
                this.removeChatBubble(passenger.id);
            }, 5000));
        }, 500);
    }













    /**
     * 检查位置需求
     * 根据乘客的描述判断具体的位置要求
     * @param {Object} passenger 乘客对象
     * @param {Object} seat 座位对象
     * @returns {boolean} 是否满足位置需求
     */
    checkPositionRequirement(passenger, seat) {
        const description = passenger.description || "";

        console.log(`🎯 ${passenger.name} 位置需求检查:`, {
            描述: description,
            座位ID: seat.id,
            座位类型: seat.type,
            是否靠窗: seat.isWindow
        });

        // 1. 检查"不要站位"需求
        if (description.includes("不要站位") ||
            description.includes("不要给我安排站位") ||
            description.includes("需要座位") ||
            description.includes("残疾人")) {
            // 贾诩：不能站立
            if (seat.type === 'standing') {
                console.log(`${passenger.name}: 被安排在站位，不满意`);
                return false;
            } else {
                console.log(`${passenger.name}: 被安排在座位，满意`);
                return true;
            }
        }

        // 2. 检查"必须站立"需求
        if (description.includes("必须站立") ||
            description.includes("需要站立") ||
            description.includes("运动员")) {
            // 凌统：必须站立
            if (seat.type === 'standing') {
                console.log(`${passenger.name}: 被安排在站位，满意`);
                return true;
            } else {
                console.log(`${passenger.name}: 被安排在座位，不满意`);
                return false;
            }
        }

        // 3. 检查"靠窗"需求
        if (description.includes("靠窗") ||
            description.includes("要看风景") ||
            description.includes("窗边")) {
            return seat.isWindow === true;
        }

        // 4. 检查"靠过道"需求
        if (description.includes("靠过道") ||
            description.includes("过道边") ||
            description.includes("方便进出")) {
            return seat.isWindow === false && seat.type === 'seat';
        }

        // 5. 检查"前排"需求
        if (description.includes("前排") ||
            description.includes("前面") ||
            description.includes("车头")) {
            return seat.id <= 4; // 假设1-4是前排
        }

        // 6. 检查"后排"需求
        if (description.includes("后排") ||
            description.includes("后面") ||
            description.includes("车尾")) {
            return seat.id >= 13; // 假设13-16是后排
        }
        // 7. 检查"双人座"需求
        if (description.includes("双人座") || description.includes("两人座")) {
            return seat.id >= 5 && seat.id <= 16; // 5-16是双人座
        }

        // 8. 检查"单人座"需求  
        if (description.includes("单人座") || description.includes("单独坐")) {
            return seat.id <= 4; // 1-4是单人座
        }

        // 9. 检查"安静位置"需求
        if (description.includes("安静") || description.includes("不吵")) {
            // 检查周围座位是否空着
            const adjacentSeats = this.getAdjacentSeatIds(seat.id);
            const occupiedAdjacent = adjacentSeats.some(adjSeatId => {
                const adjSeat = this.seats.find(s => s.id === adjSeatId);
                return adjSeat && adjSeat.occupied;
            });
            return !occupiedAdjacent;
        }

        // 如果没有明确要求，默认满意
        console.log(`${passenger.name}: 没有具体位置要求，默认满意`);
        return true;
    }

    /**
     * 检查两个座位是否相邻（同一双人座）
     * @param {number} seatId1 座位1ID
     * @param {number} seatId2 座位2ID
     * @returns {boolean} 是否相邻
     */
    checkIfAdjacentSeats(seatId1, seatId2) {
        // 根据实际座位布局定义相邻关系
        const adjacentPairs = [
            [5, 6], [6, 5],   // 第1排双人座
            [7, 8], [8, 7],   // 第2排双人座
            [9, 10], [10, 9], // 第3排双人座
            [11, 12], [12, 11], // 第4排双人座
            [13, 14], [14, 13], // 第5排双人座
            [15, 16], [16, 15]  // 第6排双人座
        ];

        return adjacentPairs.some(pair =>
            (pair[0] === seatId1 && pair[1] === seatId2) ||
            (pair[1] === seatId1 && pair[0] === seatId2)
        );
    }

    /**
     * 检查邻座是否有吃东西的乘客
     * @param {number} seatId 座位ID
     * @returns {boolean} 是否有吃东西的邻座
     */
    checkEatingNeighbor(seatId) {
        // 查找相邻座位
        const adjacentSeatIds = this.getAdjacentSeatIds(seatId);

        for (const adjSeatId of adjacentSeatIds) {
            const adjSeat = this.seats.find(s => s.id === adjSeatId);
            if (adjSeat && adjSeat.occupied) {
                const adjPassenger = this.passengers.find(p => p.id === adjSeat.passengerId);
                if (adjPassenger && adjPassenger.preferences &&
                    adjPassenger.preferences.includes("吃东西")) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * 获取相邻座位ID
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
     * 初始化满意度统计显示
     */
    initSatisfactionDisplay() {
        // 获取满意度显示元素
        this.satisfactionDisplay = document.getElementById('satisfaction-display');
        if (!this.satisfactionDisplay) {
            console.warn('未找到满意度显示元素');
            return;
        }

        // 更新总乘客数显示
        const totalPassengersElement = document.getElementById('total-passengers');
        if (totalPassengersElement) {
            totalPassengersElement.textContent = this.totalPassengers;
        }

        // 初始更新满意度计数
        this.updateSatisfactionDisplay();

        console.log('满意度显示初始化完成');
    }

    /**
     * 更新满意度统计显示
     */
    updateSatisfactionDisplay() {
        // 计算当前满意度
        this.calculateSatisfaction();

        // 更新显示
        const satisfactionCountElement = document.getElementById('satisfaction-count');
        if (satisfactionCountElement) {
            satisfactionCountElement.textContent = this.satisfiedCount;
        }

        console.log(`满意度更新: ${this.satisfiedCount}/${this.totalPassengers} (${this.score}%)`);
    }

    /**
     * 初始化发车按钮
     */
    initDepartButton() {
        // 现在按钮已经在HTML中，只需要获取引用和添加事件
        this.departButton = document.getElementById('depart-button');
        if (!this.departButton) {
            console.error('未找到发车按钮元素');
            return;
        }

        // 设置按钮初始样式（确保与CSS一致）
        this.departButton.style.display = 'flex';

        // 添加悬停效果
        this.departButton.addEventListener('mouseenter', () => {
            this.departButton.style.background = 'linear-gradient(145deg, #8f3b2f, #7a3228)';
            this.departButton.style.transform = 'translateY(-3px)';
        });

        this.departButton.addEventListener('mouseleave', () => {
            this.departButton.style.background = 'linear-gradient(145deg, #E06C5D, #c55648)';
            this.departButton.style.transform = 'translateY(0)';
        });

        // 添加点击事件
        this.departButton.addEventListener('click', async () => {
            // 设置车已启动
            if (this.dialogSystem) {
                this.dialogSystem.setCarStarted();
            }

            // 计算当前满意度
            this.calculateSatisfaction();

            // ✅ 修改：使用自定义确认弹窗
            const shouldDepart = await this.showDepartConfirmModal();
            if (!shouldDepart) {
                return; // 用户选择取消，继续游戏
            }

            // 显示结果弹窗
            this.showResultModal();
        });

        console.log('发车按钮初始化完成');
    }


    /**
     * 显示自定义重新开始确认弹窗（修正版）
     * @param {string} title 弹窗标题
     * @param {string} message 弹窗消息
     * @returns {Promise<boolean>} 返回 true 表示确认重新开始，false 表示取消
     */
    showRestartConfirmModal(title = '重新开始游戏', message = '确定要重新开始游戏吗？当前进度将会丢失。') {
        return new Promise((resolve) => {
            // 创建弹窗
            const modal = document.createElement('div');
            modal.className = 'restart-confirm-modal';

            const modalContent = document.createElement('div');
            modalContent.className = 'restart-confirm-content';

            // 标题
            const titleElement = document.createElement('h2');
            titleElement.className = 'restart-title';
            titleElement.textContent = title;

            // 提示信息
            const messageElement = document.createElement('div');
            messageElement.className = 'restart-message';
            messageElement.textContent = message;

            // 按钮容器
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'restart-buttons';

            // 确认按钮 - 使用与游戏风格一致的样式
            const confirmBtn = document.createElement('button');
            confirmBtn.className = 'restart-btn confirm-restart-btn';
            confirmBtn.innerHTML = '确认';
            confirmBtn.addEventListener('click', () => {
                modal.remove();
                resolve(true);
            });

            // 取消按钮
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'restart-btn cancel-restart-btn';
            cancelBtn.innerHTML = '取消';
            cancelBtn.addEventListener('click', () => {
                modal.remove();
                resolve(false);
            });

            // 组装弹窗
            buttonContainer.appendChild(confirmBtn);
            buttonContainer.appendChild(cancelBtn);

            modalContent.appendChild(titleElement);
            modalContent.appendChild(messageElement);
            modalContent.appendChild(buttonContainer);

            modal.appendChild(modalContent);
            document.body.appendChild(modal);

            // ESC键关闭弹窗（默认取消）
            const closeModal = (e) => {
                if (e.key === 'Escape') {
                    modal.remove();
                    document.removeEventListener('keydown', closeModal);
                    resolve(false);
                }
            };
            document.addEventListener('keydown', closeModal);

            // 点击背景关闭（默认取消）
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                    document.removeEventListener('keydown', closeModal);
                    resolve(false);
                }
            });
        });
    }





    /**
     * 显示自定义确认发车弹窗
     * @returns {Promise<boolean>} 返回 true 表示确认发车，false 表示取消
     */
    showDepartConfirmModal() {
        return new Promise((resolve) => {
            // 创建弹窗
            const modal = document.createElement('div');
            modal.className = 'confirm-depart-modal';

            const modalContent = document.createElement('div');
            modalContent.className = 'confirm-depart-content';

            // 关闭按钮
            const closeBtn = document.createElement('button');
            closeBtn.className = 'close-confirm-btn';
            closeBtn.innerHTML = '×';
            closeBtn.addEventListener('click', () => {
                modal.remove();
                resolve(false);
            });

            // 标题
            const title = document.createElement('h2');
            title.className = 'confirm-title';
            title.textContent = '确认发车';

            // 提示信息
            const message = document.createElement('div');
            message.className = 'confirm-message';
            message.textContent = '是否确认发车查看当前结果？';

            // 按钮容器
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'confirm-buttons';

            // 确认按钮
            const confirmBtn = document.createElement('button');
            confirmBtn.className = 'confirm-btn confirm-ok';
            confirmBtn.innerHTML = '<i class="fas fa-check-circle"></i> 确认发车';
            confirmBtn.addEventListener('click', () => {
                modal.remove();
                resolve(true);
            });

            // 取消按钮
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'confirm-btn confirm-cancel';
            cancelBtn.innerHTML = '<i class="fas fa-times-circle"></i> 取消';
            cancelBtn.addEventListener('click', () => {
                modal.remove();
                resolve(false);
            });

            // 组装弹窗
            buttonContainer.appendChild(confirmBtn);
            buttonContainer.appendChild(cancelBtn);

            modalContent.appendChild(closeBtn);
            modalContent.appendChild(title);
            modalContent.appendChild(message);
            modalContent.appendChild(buttonContainer);

            modal.appendChild(modalContent);
            document.body.appendChild(modal);

            // ESC键关闭弹窗
            const closeModal = (e) => {
                if (e.key === 'Escape') {
                    modal.remove();
                    document.removeEventListener('keydown', closeModal);
                    resolve(false);
                }
            };
            document.addEventListener('keydown', closeModal);

            // 点击背景关闭
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                    document.removeEventListener('keydown', closeModal);
                    resolve(false);
                }
            });
        });
    }


    /**
     * 显示结果弹窗
     */
    showResultModal() {
        // 计算满意度
        this.calculateSatisfaction();

        // 创建弹窗
        const modal = document.createElement('div');
        modal.className = 'result-modal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
        modal.style.zIndex = '9999';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.backdropFilter = 'blur(5px)';

        const modalContent = document.createElement('div');
        modalContent.className = 'result-modal-content';
        modalContent.style.backgroundColor = '#2C3E50';
        modalContent.style.padding = '40px';
        modalContent.style.borderRadius = '15px';
        modalContent.style.textAlign = 'center';
        modalContent.style.color = 'white';
        modalContent.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.5)';
        modalContent.style.minWidth = '400px';
        modalContent.style.maxWidth = '600px';

        // 标题
        const title = document.createElement('h2');
        title.textContent = '游戏结果';
        title.style.marginBottom = '30px';
        title.style.color = '#E06C5D';
        title.style.fontSize = '32px';

        // 得分显示
        const scoreText = document.createElement('div');
        scoreText.innerHTML = `乘客满意度: <span style="font-size: 48px; color: #2ecc71;">${this.score}%</span>`;
        scoreText.style.marginBottom = '20px';
        scoreText.style.fontSize = '24px';

        // 满意乘客数量
        const satisfiedText = document.createElement('div');
        satisfiedText.innerHTML = `满意乘客: <span style="color: #2ecc71;">${this.satisfiedCount}</span> / ${this.totalPassengers}`;
        satisfiedText.style.marginBottom = '30px';
        satisfiedText.style.fontSize = '20px';

        // 乘客满意度详情
        const detailsContainer = document.createElement('div');
        detailsContainer.style.marginBottom = '30px';
        detailsContainer.style.maxHeight = '200px';
        detailsContainer.style.overflowY = 'auto';
        detailsContainer.style.textAlign = 'left';

        this.passengers.forEach(passenger => {
            const passengerDetail = document.createElement('div');
            passengerDetail.style.padding = '8px 0';
            passengerDetail.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
            passengerDetail.style.display = 'flex';
            passengerDetail.style.justifyContent = 'space-between';
            passengerDetail.style.alignItems = 'center';

            const nameSpan = document.createElement('span');
            nameSpan.textContent = passenger.name;

            const statusSpan = document.createElement('span');
            statusSpan.textContent = passenger.satisfied ? '✓ 满意' : '✗ 不满意';
            statusSpan.style.color = passenger.satisfied ? '#2ecc71' : '#e74c3c';

            passengerDetail.appendChild(nameSpan);
            passengerDetail.appendChild(statusSpan);
            detailsContainer.appendChild(passengerDetail);
        });

        // 按钮容器
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '15px';
        buttonContainer.style.justifyContent = 'center';
        // 重新开始按钮（结果弹窗中的）
        const restartBtn = document.createElement('button');
        restartBtn.textContent = '重新开始';
        restartBtn.style.padding = '12px 24px';
        restartBtn.style.backgroundColor = '#E06C5D';
        restartBtn.style.color = 'white';
        restartBtn.style.border = 'none';
        restartBtn.style.borderRadius = '8px';
        restartBtn.style.cursor = 'pointer';
        restartBtn.style.fontSize = '16px';
        restartBtn.addEventListener('click', async () => {
            // 先关闭结果弹窗
            modal.remove();

            // 显示重新开始确认弹窗（美观的弹窗）
            const shouldRestart = await this.showRestartConfirmModal();
            if (shouldRestart) {
                this.restartGame();
            }
        });

        // 返回主页按钮
        const homeBtn = document.createElement('button');
        homeBtn.textContent = '返回主页';
        homeBtn.style.padding = '12px 24px';
        homeBtn.style.backgroundColor = '#3498db';
        homeBtn.style.color = 'white';
        homeBtn.style.border = 'none';
        homeBtn.style.borderRadius = '8px';
        homeBtn.style.cursor = 'pointer';
        homeBtn.style.fontSize = '16px';
        homeBtn.addEventListener('click', () => {
            this.returnToHome();
        });

        buttonContainer.appendChild(restartBtn);
        buttonContainer.appendChild(homeBtn);

        // 组装弹窗
        modalContent.appendChild(title);
        modalContent.appendChild(scoreText);
        modalContent.appendChild(satisfiedText);
        modalContent.appendChild(detailsContainer);
        modalContent.appendChild(buttonContainer);
        modal.appendChild(modalContent);

        document.body.appendChild(modal);
    }



    /**
     * 显示聊天气泡
     * @param {Object} passenger 乘客对象
     */
    showChatBubble(passenger) {
        if (!passenger.placed || !passenger.seatId) return;

        const passengerElement = document.querySelector(`.passenger-on-seat[data-passenger-id="${passenger.id}"]`);
        if (!passengerElement) return;

        // 创建聊天气泡
        const chatBubble = document.createElement('div');
        chatBubble.className = 'chat-bubble';
        chatBubble.dataset.passengerId = passenger.id;
        chatBubble.textContent = passenger.seatChatContent;

        // 设置样式
        chatBubble.style.position = 'absolute';
        chatBubble.style.bottom = '100%';
        chatBubble.style.left = '50%';
        chatBubble.style.transform = 'translateX(-50%)';
        chatBubble.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        chatBubble.style.color = 'white';
        chatBubble.style.padding = '8px 12px';
        chatBubble.style.borderRadius = '10px';
        chatBubble.style.fontSize = '14px';
        chatBubble.style.whiteSpace = 'nowrap';
        chatBubble.style.zIndex = '1001';
        chatBubble.style.pointerEvents = 'none';
        chatBubble.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';

        // 添加小三角
        const triangle = document.createElement('div');
        triangle.style.position = 'absolute';
        triangle.style.top = '100%';
        triangle.style.left = '50%';
        triangle.style.transform = 'translateX(-50%)';
        triangle.style.width = '0';
        triangle.style.height = '0';
        triangle.style.borderLeft = '6px solid transparent';
        triangle.style.borderRight = '6px solid transparent';
        triangle.style.borderTop = '6px solid rgba(0, 0, 0, 0.8)';

        chatBubble.appendChild(triangle);
        passengerElement.appendChild(chatBubble);

        // 保存引用
        this.chatBubbles.set(passenger.id, chatBubble);
    }

    // /**
    //  * 移除聊天气泡
    //  * @param {number} passengerId 乘客ID
    //  */
    // removeChatBubble(passengerId) {
    //     const chatBubble = this.chatBubbles.get(passengerId);
    //     if (chatBubble) {
    //         chatBubble.remove();
    //         this.chatBubbles.delete(passengerId);
    //     }

    //     // 清除计时器
    //     const timer = this.chatTimers.get(passengerId);
    //     if (timer) {
    //         clearTimeout(timer);
    //         this.chatTimers.delete(passengerId);
    //     }
    // }

    /**
     * 初始化座位事件
     */
    initSeats() {
        const seats = document.querySelectorAll('.seat, .standing-spot');

        seats.forEach(seatElement => {
            // 存储座位元素引用
            const seatId = parseInt(seatElement.dataset.seatId);
            const seat = this.seats.find(s => s.id === seatId);
            if (seat) {
                seat.element = seatElement;
            }

            // 为座位添加鼠标悬停事件，用于显示已放置乘客的需求卡
            seatElement.addEventListener('mouseenter', (e) => {
                if (this.isPaused) return;

                // 触发座位悬停对话
                if (this.dialogSystem) {
                    const seatId = parseInt(seatElement.dataset.seatId);
                    const seat = this.seats.find(s => s.id === seatId);
                    if (seat && !seat.occupied) {
                        this.dialogSystem.triggerSeatHoverDialog(seat, seatElement);
                    }
                }

                // 检查座位上是否有乘客
                if (seat && seat.occupied) {
                    const passenger = this.passengers.find(p => p.id === seat.passengerId);
                    if (passenger) {
                        console.log(`鼠标进入座位，显示乘客 ${passenger.name} 的需求卡`);
                        this.currentHoveredPassenger = passenger.id;
                        this.showPassengerDemand(passenger);
                    }
                }
            });

            seatElement.addEventListener('mouseleave', (e) => {
                const relatedTarget = e.relatedTarget;
                let movedToAnotherElement = false;

                // 检查是否移到了另一个座位或乘客上
                if (relatedTarget) {
                    const toSeat = relatedTarget.closest('.seat') || relatedTarget.closest('.standing-spot');
                    const toPassenger = relatedTarget.closest('.passenger-on-seat');

                    if (toSeat || toPassenger) {
                        movedToAnotherElement = true;
                    }
                }

                if (!movedToAnotherElement) {
                    this.currentHoveredPassenger = null;
                    if (!this.selectedPassenger) {
                        setTimeout(() => {
                            if (!this.currentHoveredPassenger) {
                                this.hidePassengerDemand();
                            }
                        }, 100);
                    }
                }
            });
        });
    }

    /**
     * 初始化对话系统
     */
    async initDialogSystem() {
        try {
            console.log('🚀 开始初始化对话系统...');

            // 防止重复初始化
            if (this.dialogSystemInitialized) {
                console.log('⚠️ 对话系统已经初始化过，跳过');
                return;
            }

            // 检查DialogSystem类是否已定义
            if (typeof DialogSystem === 'undefined') {
                console.error('❌ DialogSystem 类未定义！');
                // 创建备用对话系统
                this.dialogSystem = this.createFallbackDialogSystem();
                this.dialogSystemInitialized = true;
                return;
            }

            // 创建DialogSystem实例
            console.log('🔧 创建DialogSystem实例...');
            this.dialogSystem = new DialogSystem(this);
            console.log('✅ DialogSystem实例创建成功');

            // ✅ 关键修复：等待对话系统初始化完成
            console.log('🔧 正在初始化对话系统...');
            const initSuccess = await this.dialogSystem.init();

            if (!initSuccess) {
                console.warn('⚠️ 对话系统初始化可能有问题');
            }

            console.log('✅ 对话系统初始化完成');
            console.log('✅ 加载的对话数量:', this.dialogSystem.dialogs.length);

            // 标记为已初始化
            this.dialogSystemInitialized = true;

            // ============== 在这里添加调试信息 ==============
            setTimeout(() => {
                if (this.dialogSystem) {
                    console.log('🔍 ====== 对话系统调试信息 ======');
                    console.log(`📋 总对话数: ${this.dialogSystem.dialogs.length}`);

                    // 打印所有条件特定对话
                    const conditionDialogs = this.dialogSystem.dialogs.filter(d => d.trigger_type === 'condition_specific');
                    console.log(`🎯 条件特定对话: ${conditionDialogs.length} 条`);
                    conditionDialogs.forEach(d => {
                        console.log(`   - ID:${d.id}, 乘客:${d.condition_passenger}, 条件:${d.trigger_condition}, 文本:"${d.dialog_text}"`);
                    });

                    // 打印所有故事对话
                    const storyDialogs = this.dialogSystem.dialogs.filter(d => d.content_type === 'story' || d.id >= 100);
                    console.log(`📖 故事对话: ${storyDialogs.length} 条`);
                    storyDialogs.forEach(d => {
                        console.log(`   - ID:${d.id}, 左侧:${d.left_character}, 右侧:${d.right_character}, 说话者:${d.speaking_side}, 文本:"${d.dialog_text}"`);
                    });

                    console.log('=================================');
                }
            }, 1000);
            // ============== 调试信息结束 ==============

            // 延迟一小段时间后显示对话
            setTimeout(() => {
                if (this.dialogSystem && this.dialogSystem.startGameDialogs) {
                    console.log('🔄 启动游戏对话...');
                    this.dialogSystem.startGameDialogs();
                }
            }, 500);

        } catch (error) {
            console.error('❌ 对话系统初始化失败:', error);
            console.error('❌ 完整错误:', error.stack);

            // 创建备用对话系统
            this.dialogSystem = this.createFallbackDialogSystem();
            this.dialogSystemInitialized = true;
        }
    }


    /**
     * 启动对话系统
     */
    startDialogSystem() {
        if (!this.dialogSystem) {
            console.warn('⚠️ 对话系统未初始化，无法启动');
            return;
        }

        try {
            console.log('🚀 开始游戏对话...');

            // 检查startGameDialogs方法是否存在
            if (typeof this.dialogSystem.startGameDialogs === 'function') {
                this.dialogSystem.startGameDialogs();
                console.log('✅ 游戏对话已开始');
            } else {
                console.warn('⚠️ dialogSystem.startGameDialogs 不是函数', this.dialogSystem);
            }

            // 绑定乘客悬停事件
            this.bindPassengerHoverEvents();

            // 绑定座位悬停事件
            this.bindSeatHoverEvents();

            console.log('✅ 对话系统启动完成');

        } catch (error) {
            console.error('❌ 启动对话系统失败:', error);
        }
    }

    /**
     * 绑定乘客悬停事件
     */
    bindPassengerHoverEvents() {
        this.passengers.forEach(passenger => {
            if (passenger.element) {
                // 移除旧的监听器（避免重复绑定）
                const newElement = passenger.element.cloneNode(true);
                passenger.element.parentNode.replaceChild(newElement, passenger.element);
                passenger.element = newElement;

                // 添加新的监听器
                passenger.element.addEventListener('mouseenter', (e) => {
                    e.stopPropagation();
                    if (!this.isPaused && !passenger.placed && this.dialogSystem) {
                        this.dialogSystem.triggerPassengerHoverDialog(passenger);
                    }
                });
            }
        });
    }

    /**
     * 绑定座位悬停事件
     */
    bindSeatHoverEvents() {
        const seats = document.querySelectorAll('.seat, .standing-spot');

        seats.forEach(seatElement => {
            const newSeatElement = seatElement.cloneNode(true);
            seatElement.parentNode.replaceChild(newSeatElement, seatElement);

            const seatId = parseInt(newSeatElement.dataset.seatId);
            const seat = this.seats.find(s => s.id === seatId);
            if (seat) {
                seat.element = newSeatElement;
            }

            newSeatElement.addEventListener('mouseenter', (e) => {
                e.stopPropagation();
                if (!this.isPaused && !seat.occupied && this.dialogSystem) {
                    this.dialogSystem.triggerSeatHoverDialog(seat, newSeatElement);
                }
            });
        });
    }

    /**
     * 创建备用对话系统（防止报错）
     */
    createFallbackDialogSystem() {
        console.warn('⚠️ 使用备用对话系统');
        return {
            triggerPassengerPlacedDialog: (passenger, seat) => {
                console.log('备用: 乘客放置对话', passenger?.name);
            },
            triggerPassengerHoverDialog: (passenger) => {
                console.log('备用: 乘客悬停对话', passenger?.name);
            },
            triggerSeatHoverDialog: (seat) => {
                console.log('备用: 座位悬停对话', seat?.id);
            },
            triggerSeatHoverTooltip: (seat) => {
                console.log('备用: 座位悬停提示', seat?.id);
            },
            triggerAllPassengersSeatedDialog: () => {
                console.log('备用: 所有乘客就座对话');
            },
            setCarStarted: () => {
                console.log('备用: 车已启动');
            },
            checkCarNotStarted: () => {
                console.log('备用: 检查车未启动');
            },
            cleanup: () => {
                console.log('备用: 清理对话');
            },
            reset: () => {
                console.log('备用: 重置对话系统');
            },
            startGameDialogs: () => {
                console.log('备用: 开始游戏对话');
                // 显示简单的欢迎消息
                setTimeout(() => {
                    alert('欢迎来到公交车座位游戏！\n请根据乘客需求安排座位。');
                }, 500);
            }
        };
    }

    /**
     * 检查车还没开的情况
     */
    checkCarNotStarted() {
        // 游戏开始60秒后检查车还没开
        setTimeout(() => {
            if (this.placedCount < this.totalPassengers && this.dialogSystem) {
                this.dialogSystem.checkCarNotStarted();
            }
        }, 60000);
    }

    /**
     * 加载默认配置
     */
    loadDefaultConfig() {
        console.log('⚠️ 注意：使用备用配置，CSV可能未加载');

        // 直接从configManager获取
        if (window.configManager && window.configManager.passengers) {
            console.log('✅ 从ConfigManager获取乘客数据');
            this.passengers = JSON.parse(JSON.stringify(window.configManager.passengers)).map(p => ({
                ...p,
                placed: false,
                seatId: null,
                element: null,
                satisfied: false,
                startX: 0,
                startY: 0,
                placedBeforeThisCall: false,
                currentIcon: p.icon,
                isAngry: false
            }));
        } else {
            console.error('❌ ConfigManager未初始化，使用最小配置');
            this.passengers = [
                {
                    id: 1,
                    name: "乘客",
                    preferences: ["无"],
                    description: "请放置到座位",
                    icon: "",
                    placed: false,
                    seatId: null,
                    element: null,
                    satisfied: false
                }
            ];
        }

        this.seats = this.createSeatsFromImage();
        this.totalPassengers = this.passengers.length;

        console.log(`配置加载完成：${this.totalPassengers}名乘客`);
    }
}

// 导出游戏类到全局作用域
if (typeof window !== 'undefined') {
    window.BusSeatGame = BusSeatGame;
    console.log("✅ BusSeatGame 已注册到全局");
}

// 同时保留Node.js导出（可选）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BusSeatGame;
}