// Шаг 1
const data = [
  {
    file: 'app.public/extjs/profiles/default/things/OnlineSchool/Course.js',
    references: [
      'Grainjs.metadata',
      'Modeleditor.view.base.baseWindow',
      'Ext.toolbar.Toolbar',
      'Ext.form.Panel',
      'Modeleditor.view.base.baseForm',
      'Modeleditor.view.base.baseGrid',
      'Modeleditor.view.base.baseWindowDictionarySingle',
      'Modeleditor.view.base.baseWindowDictionaryList',
      'Ext.app.Controller',
      'namespace.OnlineSchool',
    ],
  },
  {
    file: 'app.public/extjs/profiles/default/things/OnlineSchool/Lesson.js',
    references: [
      'Grainjs.metadata',
      'Modeleditor.view.base.baseWindow',
      'Ext.toolbar.Toolbar',
      'Ext.form.Panel',
      'Modeleditor.view.base.baseForm',
      'Modeleditor.view.base.baseGrid',
      'Modeleditor.view.base.baseWindowDictionarySingle',
      'Modeleditor.view.base.baseWindowDictionaryList',
      'Ext.app.Controller',
      'namespace.OnlineSchool',
    ],
  },
  {
    file: 'app.public/extjs/profiles/default/things/OnlineSchool/Module.js',
    references: [
      'Grainjs.metadata',
      'Modeleditor.view.base.baseWindow',
      'Ext.toolbar.Toolbar',
      'Ext.form.Panel',
      'Modeleditor.view.base.baseForm',
      'Modeleditor.view.base.baseGrid',
      'Modeleditor.view.base.baseWindowDictionarySingle',
      'Modeleditor.view.base.baseWindowDictionaryList',
      'Ext.app.Controller',
      'namespace.OnlineSchool',
    ],
  },
]

const dependencies = {}
data.forEach(item => {
  dependencies[item.file] = item.references
})

// Шаг 2
const loadOrder = []

// Шаг 3
function getDependencies(file) {
  return dependencies[file] || []
}

// Шаг 4
function loadDependencies(file) {
  if (!loadOrder.includes(file)) {
    getDependencies(file).forEach(dependency => {
      loadDependencies(dependency)
    })
    loadOrder.push(file)
  }
}

// Шаг 5
for (const file in dependencies) {
  loadDependencies(file)
}

console.log(loadOrder)

const { resolveDependencies } = require('./lib/resolver')

console.log(resolveDependencies(data))
