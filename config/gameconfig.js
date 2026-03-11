/**
 * 游戏配置文件
 * 用于存储乘客数据、座位数据和游戏配置
 */

// 乘客数据配置
const gameConfig = {
    // 乘客数据数组，包含所有乘客的信息
    passengers: [
        {
            id: 1,
            name: "陈登",
            preferences: ["吃东西"], // 乘客喜好/要求
            icon: "assets/passengers/chendeng.png", // 正常状态图标
            angryIcon: "assets/passengers/chendengAngry.png", // 生气状态图标
            description: "我会忍不住在车上吃鱼脍的~", // 需求描述
            pairedWith: null, // 同伴ID，null表示无同伴
            chatContent: "今天带的鱼脍真新鲜！", // 聊天内容
            seatChatContent: "这个位置能看到风景吗？" // 在座位上的聊天内容
        },
        {
            id: 2,
            name: "诸葛瑾",
            preferences: ["要求同伴"],
            pairedWith: 3, // 与诸葛诞是同伴
            description: "我要和阿诞一起做",
            icon: "assets/passengers/zhugejin.png",
            angryIcon: "assets/passengers/zhugejinAngry.png",
            chatContent: "阿诞怎么还没来？",
            seatChatContent: "阿诞坐我旁边就好了"
        },
        {
            id: 3,
            name: "诸葛诞",
            preferences: ["要求同伴"],
            description: "我要和兄长一起做",
            icon: "assets/passengers/zhugedan.png",
            angryIcon: "assets/passengers/zhugedanAngry.png",
            pairedWith: 2, // 与诸葛瑾是同伴
            chatContent: "兄长在哪节车厢？",
            seatChatContent: "兄长来了吗？"
        },
        {
            id: 4,
            name: "张郃",
            preferences: ["不喜欢味道"],
            description: "我不喜欢闻到异味",
            icon: "assets/passengers/zhanghe.png",
            angryIcon: "assets/passengers/zhangheAngry.png",
            pairedWith: null,
            chatContent: "车厢里空气真清新",
            seatChatContent: "希望附近没有异味"
        },
        {
            id: 5,
            name: "凌统",
            preferences: ["不能和某人做一起"],
            description: " ",
            icon: "assets/passengers/lingtong.png",
            angryIcon: "assets/passengers/lingtongAngry.png",
            pairedWith: null,
            chatContent: "今天心情不错",
            seatChatContent: "这个位置挺宽敞"
        },
        {
            id: 6,
            name: "阿蝉",
            preferences: [" "], // 空格表示无特殊要求
            description: "",
            icon: "assets/passengers/achan.png",
            angryIcon: "assets/passengers/achanAngry.png",
            pairedWith: null,
            chatContent: "今天的任务顺利完成",
            seatChatContent: "这个位置很隐蔽"
        },
        {
            id: 7,
            name: "郭嘉",
            preferences: ["要求同伴"],
            description: "我要和小红淑女做在一起",
            icon: "assets/passengers/guojia.png",
            angryIcon: "assets/passengers/guojiaAngry.png",
            pairedWith: 8, // 与贾诩是同伴
            chatContent: "小红淑女还没上车吗？",
            seatChatContent: "期待与小红淑女同坐"
        },
        {
            id: 8,
            name: "贾诩",
            preferences: ["无"], // "无"表示无特殊要求
            description: " ",
            icon: "assets/passengers/jiaxu.png",
            angryIcon: "assets/passengers/jiaxuAngry.png",
            pairedWith: null,
            chatContent: "一切都在计算之中",
            seatChatContent: "这个位置很安静"
        }
    ],

    // 座位数据 - 根据图片布局定义
    seats: [
        // 右侧单人座（靠窗）1-4
        { id: 1, row: 1, position: "driver", label: "司机位", isWindow: true },
        { id: 2, row: 2, position: "single-right", label: "右1", isWindow: true },
        { id: 3, row: 3, position: "single-right", label: "右2", isWindow: true },
        { id: 4, row: 4, position: "single-right", label: "右3", isWindow: true },

        // 左侧双人座（第1排：5-6）
        { id: 6, row: 1, position: "double-left-aisle", label: "左1-走道", isWindow: false },
        { id: 5, row: 1, position: "double-left-window", label: "左1-窗", isWindow: true },

        // 左侧双人座（第2排：7-8）
        { id: 7, row: 2, position: "double-left-aisle", label: "左2-走道", isWindow: false },
        { id: 8, row: 2, position: "double-left-window", label: "左2-窗", isWindow: true },

        // 左侧双人座（第3排：9-10）
        { id: 10, row: 3, position: "double-left-aisle", label: "左3-走道", isWindow: false },
        { id: 9, row: 3, position: "double-left-window", label: "左3-窗", isWindow: true },

        // 左侧双人座（第4排：11-12）
        { id: 11, row: 4, position: "double-left-aisle", label: "左4-走道", isWindow: false },
        { id: 12, row: 4, position: "double-left-window", label: "左4-窗", isWindow: true },

        // 左侧双人座（第5排：13-14）
        { id: 14, row: 5, position: "double-left-aisle", label: "左5-走道", isWindow: false },
        { id: 13, row: 5, position: "double-left-window", label: "左5-窗", isWindow: true },

        // 左侧双人座（第6排：15-16）
        { id: 15, row: 6, position: "double-left-aisle", label: "左6-走道", isWindow: false },
        { id: 16, row: 6, position: "double-left-window", label: "左6-窗", isWindow: true },

        // 站位 17-19
        { id: 17, row: 0, position: "standing-1", label: "站位1", isWindow: false },
        { id: 18, row: 0, position: "standing-2", label: "站位2", isWindow: false },
        { id: 19, row: 0, position: "standing-3", label: "站位3", isWindow: false }
    ],

    // 邻座关系 - 基于座位布局定义相邻关系
    adjacentSeats: {
        // 右侧单人座
        1: [2],
        2: [1, 3],
        3: [2, 4],
        4: [3, 5],
        5: [4, 6],

        // 左侧双人座（同一排相邻）
        6: [7, 8],
        7: [6],
        8: [6, 9, 10],
        9: [8],
        10: [8, 11, 12],
        11: [10],
        12: [10, 13, 14],
        13: [12],
        14: [12, 15, 16],
        15: [14],
        16: [14, 17, 18],
        17: [16],

        // 站位相邻
        18: [16, 19],
        19: [18, 20],
        20: [19]
    }
};

// 动态添加乘客示例（伍丹）
gameConfig.passengers.push({
    id: 9,
    name: "伍丹",
    preferences: ["无"],
    description: "",
    icon: "assets/passengers/wudan.png",
    angryIcon: "assets/passengers/wudanAngry.png",
    pairedWith: null,
    chatContent: "今天天气真好",
    seatChatContent: "这个位置很舒服"
});

// 导出配置对象供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = gameConfig;
}




