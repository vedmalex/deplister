# deplister
list dependency for specified ts(x)/js(x) files

# usage

Install globally or locally to consume through `npx deplister` `yarn deplister` `npm deplister`

```bash
pnpm add deplister -g
```

```bash
yarn add deplister -g
```

```bash
npm add deplister -g
```

or locally


```bash
pnpm add deplister
```

```bash
yarn add deplister
```

```bash
npm add deplister
```

usage in command line

## parameters

-

## works with

define()
require()
Ext.require('')
import()
import ... from ''

// можно использовать для определения последовательности загрузки и определения циклических зависимостей
Ext.define('')
// уже не правильно!
// нужно пользоваться Ext.require()
{extend:}
{override:}
// сделать список зависимостей чтобы было видно, что и от чего зависит
// сделать граф зависимостей и сделать поиск циклов в нем


где-то был искатель путей в графе gfs

{
  functionName:'Ext.define',
  argument: 0,
  properties:['extend', 'override', 'modelName', 'views', 'models', 'stores']
}


добавить пресет для запуска по-умолчанию

сделать выбор локального конфига

сделать загрузку асинхронную


правило для модуля

Ext.define('название модуля')
define('название модуля')

в других местах необходимо указывать просто название файлв

сделать команду сплит

split: чтобы была новая запись в file + зависимости

сделать unused dependency анализатор

- читает package.json
- проверяет есть ли ссылки на эти модули

сделать анализатор переменный уровня global

- находит ссылки на переменные не определенные в текущем файле

