module.exports = function (api) {
  api.cache(true)
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // ⚠️ NO añadir "react-native-reanimated/plugin" aquí. Ese es el nombre de v3; con Reanimated 4
    // el plugin de worklets lo configura ya `babel-preset-expo`, y declararlo otra vez (o con el
    // nombre viejo, que ya no existe) rompe el build. Toda la documentación de la era v3 dice lo
    // contrario, así que el aviso vive en el archivo que uno abriría para añadirlo.
  }
}
