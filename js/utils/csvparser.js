/**
 * CSV解析器工具
 * 提供通用的CSV解析功能
 */

class CSVParser {
    /**
     * 解析CSV文本为对象数组
     * @param {string} csvText CSV文本
     * @param {Object} options 解析选项
     * @returns {Array} 对象数组
     */
    static parse(csvText, options = {}) {
        const defaultOptions = {
            delimiter: ',', // 分隔符
            hasHeader: true, // 是否有表头
            trimValues: true, // 是否修剪值
            skipEmptyLines: true // 是否跳过空行
        };

        const config = { ...defaultOptions, ...options };
        const lines = csvText.split('\n');

        if (config.skipEmptyLines) {
            lines = lines.filter(line => line.trim() !== '');
        }

        if (lines.length === 0) {
            return [];
        }

        let headers = [];
        let startIndex = 0;

        // 处理表头
        if (config.hasHeader) {
            headers = lines[0].split(config.delimiter).map(h => config.trimValues ? h.trim() : h);
            startIndex = 1;
        } else {
            // 如果没有表头，使用数字索引
            const firstLine = lines[0];
            const columnCount = firstLine.split(config.delimiter).length;
            headers = Array.from({ length: columnCount }, (_, i) => i.toString());
        }

        // 解析数据行
        const result = [];

        for (let i = startIndex; i < lines.length; i++) {
            const values = this.parseLine(lines[i], config);

            if (values.length === 0) {
                continue;
            }

            const obj = {};

            headers.forEach((header, index) => {
                if (index < values.length) {
                    let value = values[index];

                    if (config.trimValues) {
                        value = value.trim();
                    }

                    obj[header] = value;
                } else {
                    obj[header] = '';
                }
            });

            result.push(obj);
        }

        return result;
    }

    /**
     * 解析单行CSV（处理引号和特殊字符）
     * @param {string} line CSV行
     * @param {Object} config 配置
     * @returns {Array} 值数组
     */
    static parseLine(line, config) {
        const values = [];
        let inQuotes = false;
        let currentValue = '';
        const delimiter = config.delimiter;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = i < line.length - 1 ? line[i + 1] : '';

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    // 转义引号
                    currentValue += '"';
                    i++; // 跳过下一个引号
                } else {
                    // 开始或结束引号
                    inQuotes = !inQuotes;
                }
            } else if (char === delimiter && !inQuotes) {
                // 分隔符（不在引号内）
                values.push(currentValue);
                currentValue = '';
            } else {
                currentValue += char;
            }
        }

        // 添加最后一个值
        values.push(currentValue);

        return values;
    }

    /**
     * 将对象数组转换为CSV文本
     * @param {Array} data 对象数组
     * @param {Object} options 选项
     * @returns {string} CSV文本
     */
    static stringify(data, options = {}) {
        const defaultOptions = {
            delimiter: ',',
            includeHeader: true,
            quoteIfNeeded: true
        };

        const config = { ...defaultOptions, ...options };

        if (!data || data.length === 0) {
            return '';
        }

        const headers = Object.keys(data[0]);
        let csvText = '';

        // 表头
        if (config.includeHeader) {
            const headerLine = headers.map(header => this.quoteValue(header, config)).join(config.delimiter);
            csvText += headerLine + '\n';
        }

        // 数据行
        for (const item of data) {
            const row = headers.map(header => this.quoteValue(item[header] || '', config)).join(config.delimiter);
            csvText += row + '\n';
        }

        return csvText;
    }

    /**
     * 引用值（如果需要）
     * @param {string} value 值
     * @param {Object} config 配置
     * @returns {string} 引用后的值
     */
    static quoteValue(value, config) {
        const stringValue = value === null || value === undefined ? '' : String(value);

        if (!config.quoteIfNeeded) {
            return stringValue;
        }

        // 如果值包含分隔符、引号或换行符，需要引用
        if (stringValue.includes(config.delimiter) ||
            stringValue.includes('"') ||
            stringValue.includes('\n') ||
            stringValue.includes('\r')) {
            // 转义引号
            const escapedValue = stringValue.replace(/"/g, '""');
            return `"${escapedValue}"`;
        }

        return stringValue;
    }

    /**
     * 从CSV文件URL加载并解析数据
     * @param {string} url CSV文件URL
     * @param {Object} options 解析选项
     * @returns {Promise<Array>} 解析后的数据
     */
    static async loadFromURL(url, options = {}) {
        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const csvText = await response.text();
            return this.parse(csvText, options);
        } catch (error) {
            console.error(`CSV加载失败: ${url}`, error);
            throw error;
        }
    }

    /**
     * 将数据保存为CSV文件
     * @param {Array} data 对象数组
     * @param {string} filename 文件名
     * @param {Object} options 选项
     */
    static downloadCSV(data, filename = 'data.csv', options = {}) {
        const csvText = this.stringify(data, options);

        // 创建Blob和下载链接
        const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');

        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    }
}

// 导出CSVParser类到全局作用域
if (typeof window !== 'undefined') {
    window.CSVParser = CSVParser;
    console.log("✅ CSVParser 已注册到全局");
}

// 同时保留Node.js导出（可选）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CSVParser;
}