const { Factory } = require('fte.js/lib/standalone.fte.js')

require(['some/script.js'], function () {
  //This function is called after some/script.js has loaded.
})

define('types/Manager', ['types/Employee'], function (Employee) {
  function Manager() {
    this.reports = []
  }

  //This will now work
  Manager.prototype = new Employee()

  //return the Manager constructor function so it can be used by
  //other modules.
  return Manager
})

Ext.require(['name'], () => {
  Ext.define('Modeleditor.controller.Abstraction.Namespace', {
    serverModel: 'Abstraction.Namespace',
    extend: 'Ext.app.Controller',
  })
  Ext.define('Modeleditor.controller.Abstraction.Namespace', {
    serverModel: 'Abstraction.Namespace',
    extend: 'Ext.app.Controller',
  })
  Ext.define('Model.metamodel.Abstraction.Namespace', {
    override: 'Grainjs.metadata',
    statics: {
      'model.Abstraction.Namespace': {},
    },
  })
})

Ext.require(
  [
    'things.Admin.Navigation',
    'things.Admin.ScreenContainer',
    'things.Admin.ToolBar',
    'things.Admin.Viewport',
  ],
  function () {
    Ext.define('namespace.Admin', {})
  },
)
