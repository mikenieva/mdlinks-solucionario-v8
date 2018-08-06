module.exports = {
  "extends": "google",
  "parserOptions": {
    "ecmaVersion": 9,
    "sourceType" : "module"
  },
  "rules": {
    "require-jsdoc": ["error", {
      "require": {
        "FunctionDeclaration": false,
        "MethodDefinition": false,
        "ClassDeclaration": false
      }
    }]
  }
};