// 支付宝支付配置
// 部署时将这些值设为 Vercel 环境变量
const config = {
  // 应用 ID
  appId: process.env.ALIPAY_APP_ID || '2021006156660990',

  // 商户私钥 (PKCS8 格式，需要把 \n 替换为真实换行)
  merchantPrivateKey: (process.env.ALIPAY_PRIVATE_KEY || '').replace(/\\n/g, '\n'),

  // 支付宝公钥
  alipayPublicKey: (process.env.ALIPAY_PUBLIC_KEY || '').replace(/\\n/g, '\n'),

  // 回调地址 - 部署到 Vercel 后填真实地址
  notifyUrl: process.env.ALIPAY_NOTIFY_URL || 'https://code-explain-pay.vercel.app/api/alipay-callback',
  returnUrl: process.env.ALIPAY_RETURN_URL || 'https://code-explain-pay.vercel.app/payment/success.html',

  // 商品信息
  productName: 'CodeExplain Pro',
  productDescription: 'AI 代码解释 Pro 会员',
};

module.exports = config;
