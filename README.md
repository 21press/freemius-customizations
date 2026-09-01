# Freemius customizations

Public CSS and JS for the 21Press Freemius store and customer portal.

The portal is embedded on <https://21press.com/account/> as a **cross-origin iframe**
from `customers.freemius.com`. None of the site's own CSS reaches it, so this
repository is the only way to style it. Freemius loads these files inside the
portal; you attach the URLs in the Freemius developer dashboard.

## The URL to use

```
https://cdn.jsdelivr.net/gh/21press/freemius-customizations@v4/account.css
```

**Use a tag, never `@main`.** A tagged URL is immutable, so jsDelivr caches it
permanently and it can never serve a stale copy. This is the whole reason the
tag exists.

### Releasing a change

1. Commit the change to `main`.
2. Create the next tag on that commit:
   ```
   gh api repos/21press/freemius-customizations/git/refs -X POST \
     -f ref="refs/tags/v5" -f sha="$(gh api repos/21press/freemius-customizations/commits -q '.[0].sha')"
   ```
3. Update the URL in the Freemius dashboard to `@v5`. One character.

That step 3 is manual and cannot be automated from here; the setting lives in the
Freemius developer dashboard.

### Why not `@main` with a purge

It was tried, and it does not work reliably.

- jsDelivr's `@main` alias went stale and stayed stale through **six purges over a
  minute**, serving a 20,998-byte file while the repository had 23,046. Purge
  requests are throttled and return `"status": "finished"` while the edge keeps
  the old copy.
- Even after a successful purge, browsers that already fetched the file keep it.
  jsDelivr sends long-lived immutable headers, so a CDN purge does not reach
  them and every visitor would need a hard reload.
- A `?v=` query busts the browser cache but not the stale edge copy, so it solves
  only half the problem.

If you ever see the portal revert to Freemius' default indigo and white, the
cause is almost always a stale file rather than broken CSS. Compare sizes:

```
gh api repos/21press/freemius-customizations/contents/account.css -q .size
curl -s "https://cdn.jsdelivr.net/gh/21press/freemius-customizations@v4/account.css" | wc -c
```

## How to work on this file

### You cannot read Freemius' stylesheets

They are served cross-origin, so `document.styleSheets[n].cssRules` throws and
returns nothing. You cannot enumerate their rules to find what you are fighting.
Work from **computed styles on live elements** instead:

```js
getComputedStyle(document.querySelector('#sidenav_left')).backgroundColor
```

To find every light surface on a screen, walk the DOM and test computed
backgrounds. That is how the override list in `account.css` was built.

### Inspect the portal directly, not the iframe

The parent page cannot reach into the iframe. Open the portal on its own origin:

```
https://customers.freemius.com/store/3364/profile
```

The signed-in screens need a real session. Sign in yourself first; do not put
credentials in an agent's hands.

### Test before committing

Inject the candidate CSS into the live portal and measure the result:

```js
const css = await (await fetch(URL, {cache:'reload'})).text();
const s = document.createElement('style'); s.textContent = css;
document.head.appendChild(s);
```

`{cache:'reload'}` matters. A plain `fetch` returns the browser's cached copy and
you will test the wrong file.

## The specificity rule, and why the IDs are load-bearing

**Do not "simplify" the `#app_container` and `#sidenav_left` prefixes out of the
selectors.** The rules stop applying and the portal reverts to indigo and white.

Freemius sets many properties with `!important` at ID specificity. This was
established by testing, not assumed:

| Attempt | Result |
|---|---|
| Inline style, no `!important` | lost |
| Inline style with `!important` | won |
| `.mat-raised-button` + `!important` | lost |
| `a.menu-item-link.menu-item-link.--active.--active` (0,5,1) + `!important` | lost |
| `#app_container #sidenav_left a.menu-item-link.--active` (2 IDs) + `!important` | won |

An ID beats any number of classes, so a class-only rule can never win against
theirs no matter how many classes you stack.

Practical consequence: a rule that works on the **login** view often fails on the
**signed-in** views, because Freemius re-applies its own styling once the app
shell renders. Several rules in `account.css` are deliberately written twice, once
plain and once prefixed. That duplication is intentional.


### Depth of Freemius' own selectors

Some of their rules are deep enough that two IDs still lose. The login form is
the worst case, probed live:

| Selector | Result |
|---|---|
| `#form .mat-form-field-required-marker` | lost |
| `#form_container #form .mat-form-field-required-marker` | lost |
| `#login #form_container #form .mat-form-field-required-marker` | won |

Probe before assuming. Inject a candidate rule, read the computed value back,
and remove it:

```js
const probe = (el, rule) => {
  const s = document.createElement('style');
  s.textContent = rule; document.head.appendChild(s);
  const v = getComputedStyle(el).color; s.remove(); return v;
};
```

If an inline style with `!important` changes it but your stylesheet rule does
not, the fight is specificity, not correctness.

## Freemius quirks worth knowing

- The login card is `div#form_container` with **no class at all**. Material card
  selectors miss it entirely.
- Icons are inline SVG painted with `fill`, not `stroke`, so setting `color`
  alone does not reach them. Use `fill: currentColor`.
- `.mat-button-focus-overlay` stays painted on items that have been clicked. With
  a tinted overlay this makes a navigation rail look blotchy, so it is zeroed
  inside `#sidenav_left`.
- The license key renders in its own chip at `.mat-column-license_key > div`.
- The FAQ column divider is a `border-right` on `.faq--accordion > div > div`,
  shipped at `rgb(240,240,250)`.
- Material separates FAQ panels with a `box-shadow`, not a border, so setting a
  border colour alone leaves the light seams visible.
- The footer inherits its parent. Signed in that parent is dark and the band
  looks fine; signed out it is white, so the footer must be targeted explicitly
  or it appears as a white stripe under the login card.

## Design tokens

The `:root` block at the top of `account.css` mirrors the live Delta palette from
the site's `tokens.json`. It is duplicated rather than referenced because the
portal cannot see the site's stylesheets. **Keep it in step when the site palette
changes**, including the alpha on `--p21-border`.

Fonts are served from the site's own Font Manager and are confirmed to load
cross-origin from `customers.freemius.com`. If that ever changes, the stacks fall
back to system sans and only the type changes, not the layout.

## Check these after any change

Login (signed out), then Websites, Downloads, Licenses, Subscriptions, Invoices,
My Profile, FAQ, Support.

The signed-out view and the signed-in views style differently, so verifying one
does not verify the other.

## JS

`account.js` is attached the same way and is currently empty apart from its
header.

```
https://cdn.jsdelivr.net/gh/21press/freemius-customizations@v4/account.js
```
