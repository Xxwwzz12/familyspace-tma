// Патчинг JSON для поддержки BigInt
(BigInt.prototype as any).toJSON = function() {
  return this.toString();
};