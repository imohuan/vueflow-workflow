/**
 * PocketBase 前端缓存 Handler
 * 实现 CacheHandler 接口，用于 context.ts 的前端数据保存
 */

import PocketBase from "pocketbase";

const DEFAULT_NAMESPACE = "app";

/**
 * 构建存储键名
 * @param {string} key - 原始键名
 * @param {string} namespace - 命名空间
 * @returns {string} 构建后的键名
 */
function buildStorageKey(key, namespace) {
  const ns = namespace || DEFAULT_NAMESPACE;
  return `ctx:${ns}:${key}`;
}

export function injectPocketBase() {
  if (!window?.pocketbaseAPI?.url) return;
  globalThis.__CONTEXT__HANDLER__ = createPocketBaseCacheHandler({
    pbUrl: window.pocketbaseAPI.url,
  });
}

/**
 * 创建 PocketBase 缓存处理器
 * @param {Object} options - 配置选项
 * @param {string} options.pbUrl - PocketBase 服务器地址，默认 http://127.0.0.1:8090
 * @param {string} options.collectionName - 集合名称，默认 app_cache
 * @returns {Promise<Object>} 返回符合 CacheHandler 接口的对象
 */
export function createPocketBaseCacheHandler(options = {}) {
  const pbUrl = options.pbUrl || "http://127.0.0.1:8090";
  const collectionName = options.collectionName || "app_cache";

  // 创建 PocketBase 实例
  const pb = new PocketBase(pbUrl);

  /**
   * 获取缓存记录
   * @param {string} storageKey - 存储键名
   * @returns {Promise<Object|null>} 返回记录对象或 null
   */
  async function getCacheRecord(storageKey) {
    try {
      const record = await pb
        .collection(collectionName)
        .getFirstListItem(`key = "${storageKey}"`);

      // 检查是否过期
      if (record.expireAt) {
        const expireTime = new Date(record.expireAt).getTime();
        if (Date.now() > expireTime) {
          // 已过期，删除记录
          await pb.collection(collectionName).delete(record.id);
          return null;
        }
      }

      return record;
    } catch (error) {
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  return {
    /**
     * 获取缓存值
     * @param {string} key - 键名
     * @param {Object} options - 选项
     * @param {string} options.namespace - 命名空间
     * @returns {Promise<any>} 返回缓存值或 undefined
     */
    async get(key, options = {}) {
      try {
        const storageKey = buildStorageKey(key, options?.namespace);
        const record = await getCacheRecord(storageKey);

        if (!record) {
          return undefined;
        }

        return record.value;
      } catch (error) {
        console.error("读取缓存失败:", error);
        return undefined;
      }
    },

    /**
     * 设置缓存值
     * @param {string} key - 键名
     * @param {any} value - 值
     * @param {Object} options - 选项
     * @param {number} options.ttlMs - 过期时间（毫秒）
     * @param {string} options.namespace - 命名空间
     * @returns {Promise<void>}
     */
    async set(key, value, options = {}) {
      try {
        const storageKey = buildStorageKey(key, options?.namespace);
        const expireAt = options?.ttlMs
          ? new Date(Date.now() + options.ttlMs).toISOString()
          : null;

        const recordData = {
          key: storageKey,
          namespace: options?.namespace || DEFAULT_NAMESPACE,
          value: value,
          expireAt: expireAt,
        };

        // 检查是否已存在
        try {
          const existing = await getCacheRecord(storageKey);
          if (existing) {
            // 更新现有记录
            await pb.collection(collectionName).update(existing.id, recordData);
          } else {
            // 创建新记录
            await pb.collection(collectionName).create(recordData);
          }
        } catch (error) {
          if (error.status === 404 || !error.status) {
            // 记录不存在，创建新记录
            await pb.collection(collectionName).create(recordData);
          } else {
            throw error;
          }
        }
      } catch (error) {
        console.error("保存缓存失败:", error);
        throw error;
      }
    },

    /**
     * 删除缓存
     * @param {string} key - 键名
     * @param {Object} options - 选项
     * @param {string} options.namespace - 命名空间
     * @returns {Promise<void>}
     */
    async remove(key, options = {}) {
      try {
        const storageKey = buildStorageKey(key, options?.namespace);
        const record = await getCacheRecord(storageKey);

        if (record) {
          await pb.collection(collectionName).delete(record.id);
        }
      } catch (error) {
        if (error.status !== 404) {
          console.error("删除缓存失败:", error);
          throw error;
        }
      }
    },

    /**
     * 清空缓存
     * @param {Object} options - 选项
     * @param {string} options.namespace - 命名空间，如果提供则只清空该命名空间的缓存
     * @returns {Promise<void>}
     */
    async clear(options = {}) {
      try {
        const namespace = options?.namespace || DEFAULT_NAMESPACE;
        const prefix = `ctx:${namespace}:`;

        // 获取所有匹配的记录
        const records = await pb.collection(collectionName).getFullList({
          filter: `key ~ "${prefix}"`,
        });

        // 删除所有匹配的记录
        for (const record of records) {
          if (record.key.startsWith(prefix)) {
            await pb.collection(collectionName).delete(record.id);
          }
        }
      } catch (error) {
        console.error("清空缓存失败:", error);
        throw error;
      }
    },
  };
}
