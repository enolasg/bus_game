/**
 * 游戏工具函数
 * 提供各种辅助功能
 */

class GameHelpers {
    /**
     * 防抖函数
     * @param {Function} func 要执行的函数
     * @param {number} wait 等待时间（毫秒）
     * @returns {Function} 防抖后的函数
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * 节流函数
     * @param {Function} func 要执行的函数
     * @param {number} limit 时间限制（毫秒）
     * @returns {Function} 节流后的函数
     */
    static throttle(func, limit) {
        let inThrottle;
        return function (...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * 生成随机ID
     * @param {number} length ID长度
     * @returns {string} 随机ID
     */
    static generateId(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * 格式化时间（秒转换为分:秒）
     * @param {number} seconds 秒数
     * @returns {string} 格式化后的时间
     */
    static formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * 计算两个元素之间的距离
     * @param {HTMLElement} elem1 元素1
     * @param {HTMLElement} elem2 元素2
     * @returns {number} 距离（像素）
     */
    static getDistanceBetweenElements(elem1, elem2) {
        const rect1 = elem1.getBoundingClientRect();
        const rect2 = elem2.getBoundingClientRect();

        const centerX1 = rect1.left + rect1.width / 2;
        const centerY1 = rect1.top + rect1.height / 2;
        const centerX2 = rect2.left + rect2.width / 2;
        const centerY2 = rect2.top + rect2.height / 2;

        const dx = centerX2 - centerX1;
        const dy = centerY2 - centerY1;

        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * 检查元素是否在视口内
     * @param {HTMLElement} element 要检查的元素
     * @param {number} threshold 阈值（0-1）
     * @returns {boolean} 是否在视口内
     */
    static isInViewport(element, threshold = 0) {
        const rect = element.getBoundingClientRect();
        const windowHeight = window.innerHeight || document.documentElement.clientHeight;
        const windowWidth = window.innerWidth || document.documentElement.clientWidth;

        const verticalInView = (
            rect.top <= windowHeight * (1 - threshold) &&
            rect.bottom >= windowHeight * threshold
        );

        const horizontalInView = (
            rect.left <= windowWidth * (1 - threshold) &&
            rect.right >= windowWidth * threshold
        );

        return verticalInView && horizontalInView;
    }

    /**
     * 深拷贝对象
     * @param {Object} obj 要拷贝的对象
     * @returns {Object} 拷贝后的对象
     */
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }

        if (obj instanceof Array) {
            return obj.reduce((arr, item, i) => {
                arr[i] = this.deepClone(item);
                return arr;
            }, []);
        }

        if (typeof obj === 'object') {
            return Object.keys(obj).reduce((newObj, key) => {
                newObj[key] = this.deepClone(obj[key]);
                return newObj;
            }, {});
        }
    }

    /**
     * 获取元素的绝对位置
     * @param {HTMLElement} element 元素
     * @returns {Object} 位置对象 {x, y}
     */
    static getAbsolutePosition(element) {
        let x = 0;
        let y = 0;

        while (element) {
            x += element.offsetLeft - element.scrollLeft + element.clientLeft;
            y += element.offsetTop - element.scrollTop + element.clientTop;
            element = element.offsetParent;
        }

        return { x, y };
    }

    /**
     * 获取鼠标位置相对于元素的坐标
     * @param {MouseEvent} event 鼠标事件
     * @param {HTMLElement} element 元素
     * @returns {Object} 相对坐标 {x, y}
     */
    static getRelativeMousePosition(event, element) {
        const rect = element.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }

    /**
     * 检测设备类型
     * @returns {string} 设备类型（mobile, tablet, desktop）
     */
    static detectDeviceType() {
        const userAgent = navigator.userAgent.toLowerCase();
        const isMobile = /mobile|iphone|ipad|ipod|android|blackberry|mini|windows\sce|palm/i.test(userAgent);
        const isTablet = /tablet|ipad|playbook|silk/i.test(userAgent);

        if (isMobile) {
            return 'mobile';
        } else if (isTablet) {
            return 'tablet';
        } else {
            return 'desktop';
        }
    }

    /**
     * 计算百分比
     * @param {number} part 部分值
     * @param {number} total 总值
     * @param {number} decimals 小数位数
     * @returns {number} 百分比
     */
    static calculatePercentage(part, total, decimals = 0) {
        if (total === 0) return 0;
        const percentage = (part / total) * 100;
        return parseFloat(percentage.toFixed(decimals));
    }

    /**
     * 创建加载动画
     * @param {HTMLElement} container 容器元素
     * @param {string} message 加载消息
     */
    static createLoadingAnimation(container, message = '加载中...') {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-overlay';
        loadingDiv.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            color: white;
            font-size: 18px;
            z-index: 9999;
        `;

        loadingDiv.innerHTML = `
            <div class="loading-content">
                <div class="spinner"></div>
                <div class="loading-message">${message}</div>
            </div>
        `;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            .loading-content .spinner {
                border: 4px solid rgba(255, 255, 255, 0.3);
                border-top: 4px solid #E06C5D;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin-bottom: 15px;
            }
        `;

        document.head.appendChild(style);
        container.appendChild(loadingDiv);

        return loadingDiv;
    }

    /**
     * 移除加载动画
     * @param {HTMLElement} loadingElement 加载动画元素
     */
    static removeLoadingAnimation(loadingElement) {
        if (loadingElement && loadingElement.parentNode) {
            loadingElement.parentNode.removeChild(loadingElement);
        }
    }

    /**
     * 播放音效
     * @param {string} url 音效URL
     * @param {number} volume 音量（0-1）
     * @returns {Promise} 播放Promise
     */
    static playSound(url, volume = 0.3) {
        return new Promise((resolve, reject) => {
            try {
                const audio = new Audio(url);
                audio.volume = volume;
                audio.play().then(resolve).catch(reject);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 创建震动效果
     * @param {HTMLElement} element 要震动的元素
     * @param {number} intensity 强度（像素）
     * @param {number} duration 持续时间（毫秒）
     */
    static createShakeEffect(element, intensity = 5, duration = 300) {
        if (!element) return;

        const originalTransform = element.style.transform || '';
        const shakeInterval = 50; // 每次震动间隔
        const shakeCount = duration / shakeInterval;
        let currentShake = 0;

        const shake = () => {
            if (currentShake >= shakeCount) {
                element.style.transform = originalTransform;
                return;
            }

            const x = (Math.random() - 0.5) * 2 * intensity;
            const y = (Math.random() - 0.5) * 2 * intensity;
            element.style.transform = `${originalTransform} translate(${x}px, ${y}px)`;

            currentShake++;
            setTimeout(shake, shakeInterval);
        };

        shake();
    }

    /**
     * 创建淡入效果
     * @param {HTMLElement} element 要淡入的元素
     * @param {number} duration 持续时间（毫秒）
     */
    static fadeIn(element, duration = 300) {
        if (!element) return;

        element.style.opacity = '0';
        element.style.display = 'block';

        let opacity = 0;
        const interval = 10;
        const increment = interval / duration;

        const fade = () => {
            opacity += increment;
            element.style.opacity = opacity.toString();

            if (opacity < 1) {
                setTimeout(fade, interval);
            }
        };

        fade();
    }

    /**
     * 创建淡出效果
     * @param {HTMLElement} element 要淡出的元素
     * @param {number} duration 持续时间（毫秒）
     * @param {boolean} remove 淡出后是否移除元素
     */
    static fadeOut(element, duration = 300, remove = false) {
        if (!element) return;

        let opacity = 1;
        const interval = 10;
        const decrement = interval / duration;

        const fade = () => {
            opacity -= decrement;
            element.style.opacity = opacity.toString();

            if (opacity > 0) {
                setTimeout(fade, interval);
            } else {
                element.style.display = 'none';
                if (remove && element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            }
        };

        fade();
    }
}

// 导出GameHelpers类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameHelpers;
}