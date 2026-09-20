
## Language support

The project includes Simplified Chinese (`zh-CN`) translations in `locale/zh-CN.json`.

To enable the locale on any page, add the following script before the page's inline script:

```html
<script src="i18n.js"></script>
```

Then open the page with `?lang=zh-CN` (or select **简体中文** from the language selector). The preference is saved in `localStorage` and the existing Traditional Chinese page remains the default when no locale is selected.
