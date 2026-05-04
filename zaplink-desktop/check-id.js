import machineIdPkg from 'node-machine-id';
const { machineIdSync } = machineIdPkg;
console.log(machineIdSync());
