// /api/activate - 插件端激活接口
// 根据激活码或 deviceId 查询激活状态
// 注意：Vercel Serverless 无持久存储，激活信息存在内存中
//       生产环境应替换为数据库/Redis/Vercel KV

const config = require('./_config');

// 共享存储（与 alipay-callback.js 共用）
// 生产环境请替换为 Vercel KV 或数据库
const globalStore = global.__activationStore || {};
if (!global.__activationStore) {
  global.__activationStore = globalStore;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { code, deviceId } = req.body;

    // 方式1：用激活码激活
    if (code) {
      const activation = globalStore[code];
      if (activation && new Date(activation.expiredAt) > new Date()) {
        return res.json({
          success: true,
          activated: true,
          plan: activation.plan,
          expiredAt: activation.expiredAt,
        });
      }
      return res.json({
        success: true,
        activated: false,
        message: '激活码无效或已过期',
      });
    }

    // 方式2：用 deviceId 查询是否已激活
    if (deviceId) {
      for (const [_, info] of Object.entries(globalStore)) {
        if (info.deviceId === deviceId && new Date(info.expiredAt) > new Date()) {
          return res.json({
            success: true,
            activated: true,
            plan: info.plan,
            expiredAt: info.expiredAt,
          });
        }
      }
      return res.json({
        success: true,
        activated: false,
      });
    }

    return res.status(400).json({ error: '请提供激活码或设备ID' });

  } catch (err) {
    console.error('激活查询失败:', err);
    res.status(500).json({ error: '查询失败' });
  }
};

// 导出 store 供其他模块写入
module.exports.store = globalStore;
