/**
 * ZAPLINK KEYGEN - Gerador de Licenças
 * Uso: node keygen.js <HWID> <DIAS> <PLANO>
 * Ex: node keygen.js "f92d8..." 30 "pro"
 */

const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const SECRET = process.env.ZAPLINK_SECRET;

if (!SECRET) {
    console.error('❌ ERRO: ZAPLINK_SECRET não encontrado no arquivo .env');
    process.exit(1);
}

const args = process.argv.slice(2);
if (args.length < 1) {
    console.log('\n🚀 ZAPLINK KEYGEN - Gerador de Chaves');
    console.log('Uso: node keygen.js <HWID> [DIAS] [PLANO]');
    console.log('Ex: node keygen.js "123-abc-456" 30 pro\n');
    process.exit(0);
}

const hwid = args[0];
const dias = parseInt(args[1]) || 365;
const plano = args[2] || 'pro';

const payload = {
    machineId: hwid,
    plano: plano,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (dias * 24 * 60 * 60)
};

const token = jwt.sign(payload, SECRET);

console.log('\n✅ LICENÇA GERADA COM SUCESSO!');
console.log('--------------------------------------------------');
console.log(`💻 HWID:  ${hwid}`);
console.log(`📅 VALIDADE: ${dias} dias`);
console.log(`🏆 PLANO: ${plano.toUpperCase()}`);
console.log('--------------------------------------------------');
console.log('🔑 CHAVE DE ATIVAÇÃO (JWT):');
console.log(token);
console.log('--------------------------------------------------\n');
