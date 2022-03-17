'use strict';

Object.defineProperty(exports, '__esModule', { value: true });


const DNA = Buffer.from(dna, "base64");
const DNA_NICK = "social-context";

class JuntoSocialContextLinkAdapter {
    constructor(context) {
        //@ts-ignore
        this.socialContextDna = context.Holochain;
    }
    writable() {
        return true;
    }
    public() {
        return false;
    }
    async others() {
        return [];
    }
    async addActiveAgentLink(hcDna) {
        if (hcDna == undefined) {
            //@ts-ignore
            return await this.call(DNA_NICK, "social_context", "add_active_agent_link", null);
        }
        else {
            return await hcDna.call(DNA_NICK, "social_context", "add_active_agent_link", null);
        }
    }
    async addLink(link) {
        const data = prepareExpressionLink(link);
        const input = {
            linkExpression: data,
            indexStrategy: {
                type: "FullWithWildCard"
            },
        };
        await this.socialContextDna.call(DNA_NICK, "social_context", "add_link", input);
    }
    async updateLink(oldLinkExpression, newLinkExpression) {
        const source_link = prepareExpressionLink(oldLinkExpression);
        const target_link = prepareExpressionLink(newLinkExpression);
        const input = {
            source: source_link,
            target: target_link,
            indexStrategy: {
                type: "FullWithWildCard"
            },
        };
        await this.socialContextDna.call(DNA_NICK, "social_context", "update_link", input);
    }
    async removeLink(link) {
        const data = prepareExpressionLink(link);
        await this.socialContextDna.call(DNA_NICK, "social_context", "remove_link", data);
    }
    async getLinks(query) {
        const link_query = Object.assign(query);
        if (link_query.source == undefined) {
            link_query.source = null;
        }
        if (link_query.target == undefined) {
            link_query.target = null;
        }
        if (link_query.predicate == undefined) {
            link_query.predicate = null;
        }
        if (link_query.fromDate) {
            link_query.fromDate = link_query.fromDate.toISOString();
        }
        if (link_query.untilDate) {
            link_query.untilDate = link_query.untilDate.toISOString();
        }
        const links = await this.socialContextDna.call(DNA_NICK, "social_context", "get_links", link_query);
        //console.debug("Holchain Social Context: Got Links", links);
        return links;
    }
    addCallback(callback) {
        this.linkCallback = callback;
        return 1;
    }
    handleHolochainSignal(signal) {
        if (this.linkCallback) {
            this.linkCallback([signal.data.payload], []);
        }
    }
}
function prepareExpressionLink(link) {
    const data = Object.assign(link);
    if (data.data.source == "") {
        data.data.source = null;
    }
    if (data.data.target == "") {
        data.data.target = null;
    }
    if (data.data.predicate == "") {
        data.data.predicate = null;
    }
    return data;
}

var SettingsIcon = "'use strict';\n\nfunction noop() { }\nfunction run(fn) {\n    return fn();\n}\nfunction blank_object() {\n    return Object.create(null);\n}\nfunction run_all(fns) {\n    fns.forEach(run);\n}\nfunction is_function(thing) {\n    return typeof thing === 'function';\n}\nfunction safe_not_equal(a, b) {\n    return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');\n}\nfunction is_empty(obj) {\n    return Object.keys(obj).length === 0;\n}\n\n// Track which nodes are claimed during hydration. Unclaimed nodes can then be removed from the DOM\n// at the end of hydration without touching the remaining nodes.\nlet is_hydrating = false;\nfunction start_hydrating() {\n    is_hydrating = true;\n}\nfunction end_hydrating() {\n    is_hydrating = false;\n}\nfunction upper_bound(low, high, key, value) {\n    // Return first index of value larger than input value in the range [low, high)\n    while (low < high) {\n        const mid = low + ((high - low) >> 1);\n        if (key(mid) <= value) {\n            low = mid + 1;\n        }\n        else {\n            high = mid;\n        }\n    }\n    return low;\n}\nfunction init_hydrate(target) {\n    if (target.hydrate_init)\n        return;\n    target.hydrate_init = true;\n    // We know that all children have claim_order values since the unclaimed have been detached\n    const children = target.childNodes;\n    /*\n    * Reorder claimed children optimally.\n    * We can reorder claimed children optimally by finding the longest subsequence of\n    * nodes that are already claimed in order and only moving the rest. The longest\n    * subsequence subsequence of nodes that are claimed in order can be found by\n    * computing the longest increasing subsequence of .claim_order values.\n    *\n    * This algorithm is optimal in generating the least amount of reorder operations\n    * possible.\n    *\n    * Proof:\n    * We know that, given a set of reordering operations, the nodes that do not move\n    * always form an increasing subsequence, since they do not move among each other\n    * meaning that they must be already ordered among each other. Thus, the maximal\n    * set of nodes that do not move form a longest increasing subsequence.\n    */\n    // Compute longest increasing subsequence\n    // m: subsequence length j => index k of smallest value that ends an increasing subsequence of length j\n    const m = new Int32Array(children.length + 1);\n    // Predecessor indices + 1\n    const p = new Int32Array(children.length);\n    m[0] = -1;\n    let longest = 0;\n    for (let i = 0; i < children.length; i++) {\n        const current = children[i].claim_order;\n        // Find the largest subsequence length such that it ends in a value less than our current value\n        // upper_bound returns first greater value, so we subtract one\n        const seqLen = upper_bound(1, longest + 1, idx => children[m[idx]].claim_order, current) - 1;\n        p[i] = m[seqLen] + 1;\n        const newLen = seqLen + 1;\n        // We can guarantee that current is the smallest value. Otherwise, we would have generated a longer sequence.\n        m[newLen] = i;\n        longest = Math.max(newLen, longest);\n    }\n    // The longest increasing subsequence of nodes (initially reversed)\n    const lis = [];\n    // The rest of the nodes, nodes that will be moved\n    const toMove = [];\n    let last = children.length - 1;\n    for (let cur = m[longest] + 1; cur != 0; cur = p[cur - 1]) {\n        lis.push(children[cur - 1]);\n        for (; last >= cur; last--) {\n            toMove.push(children[last]);\n        }\n        last--;\n    }\n    for (; last >= 0; last--) {\n        toMove.push(children[last]);\n    }\n    lis.reverse();\n    // We sort the nodes being moved to guarantee that their insertion order matches the claim order\n    toMove.sort((a, b) => a.claim_order - b.claim_order);\n    // Finally, we move the nodes\n    for (let i = 0, j = 0; i < toMove.length; i++) {\n        while (j < lis.length && toMove[i].claim_order >= lis[j].claim_order) {\n            j++;\n        }\n        const anchor = j < lis.length ? lis[j] : null;\n        target.insertBefore(toMove[i], anchor);\n    }\n}\nfunction append(target, node) {\n    if (is_hydrating) {\n        init_hydrate(target);\n        if ((target.actual_end_child === undefined) || ((target.actual_end_child !== null) && (target.actual_end_child.parentElement !== target))) {\n            target.actual_end_child = target.firstChild;\n        }\n        if (node !== target.actual_end_child) {\n            target.insertBefore(node, target.actual_end_child);\n        }\n        else {\n            target.actual_end_child = node.nextSibling;\n        }\n    }\n    else if (node.parentNode !== target) {\n        target.appendChild(node);\n    }\n}\nfunction insert(target, node, anchor) {\n    if (is_hydrating && !anchor) {\n        append(target, node);\n    }\n    else if (node.parentNode !== target || (anchor && node.nextSibling !== anchor)) {\n        target.insertBefore(node, anchor || null);\n    }\n}\nfunction detach(node) {\n    node.parentNode.removeChild(node);\n}\nfunction element(name) {\n    return document.createElement(name);\n}\nfunction text(data) {\n    return document.createTextNode(data);\n}\nfunction attr(node, attribute, value) {\n    if (value == null)\n        node.removeAttribute(attribute);\n    else if (node.getAttribute(attribute) !== value)\n        node.setAttribute(attribute, value);\n}\nfunction children(element) {\n    return Array.from(element.childNodes);\n}\nfunction attribute_to_object(attributes) {\n    const result = {};\n    for (const attribute of attributes) {\n        result[attribute.name] = attribute.value;\n    }\n    return result;\n}\n\nlet current_component;\nfunction set_current_component(component) {\n    current_component = component;\n}\n\nconst dirty_components = [];\nconst binding_callbacks = [];\nconst render_callbacks = [];\nconst flush_callbacks = [];\nconst resolved_promise = Promise.resolve();\nlet update_scheduled = false;\nfunction schedule_update() {\n    if (!update_scheduled) {\n        update_scheduled = true;\n        resolved_promise.then(flush);\n    }\n}\nfunction add_render_callback(fn) {\n    render_callbacks.push(fn);\n}\nlet flushing = false;\nconst seen_callbacks = new Set();\nfunction flush() {\n    if (flushing)\n        return;\n    flushing = true;\n    do {\n        // first, call beforeUpdate functions\n        // and update components\n        for (let i = 0; i < dirty_components.length; i += 1) {\n            const component = dirty_components[i];\n            set_current_component(component);\n            update(component.$$);\n        }\n        set_current_component(null);\n        dirty_components.length = 0;\n        while (binding_callbacks.length)\n            binding_callbacks.pop()();\n        // then, once components are updated, call\n        // afterUpdate functions. This may cause\n        // subsequent updates...\n        for (let i = 0; i < render_callbacks.length; i += 1) {\n            const callback = render_callbacks[i];\n            if (!seen_callbacks.has(callback)) {\n                // ...so guard against infinite loops\n                seen_callbacks.add(callback);\n                callback();\n            }\n        }\n        render_callbacks.length = 0;\n    } while (dirty_components.length);\n    while (flush_callbacks.length) {\n        flush_callbacks.pop()();\n    }\n    update_scheduled = false;\n    flushing = false;\n    seen_callbacks.clear();\n}\nfunction update($$) {\n    if ($$.fragment !== null) {\n        $$.update();\n        run_all($$.before_update);\n        const dirty = $$.dirty;\n        $$.dirty = [-1];\n        $$.fragment && $$.fragment.p($$.ctx, dirty);\n        $$.after_update.forEach(add_render_callback);\n    }\n}\nconst outroing = new Set();\nfunction transition_in(block, local) {\n    if (block && block.i) {\n        outroing.delete(block);\n        block.i(local);\n    }\n}\nfunction mount_component(component, target, anchor, customElement) {\n    const { fragment, on_mount, on_destroy, after_update } = component.$$;\n    fragment && fragment.m(target, anchor);\n    if (!customElement) {\n        // onMount happens before the initial afterUpdate\n        add_render_callback(() => {\n            const new_on_destroy = on_mount.map(run).filter(is_function);\n            if (on_destroy) {\n                on_destroy.push(...new_on_destroy);\n            }\n            else {\n                // Edge case - component was destroyed immediately,\n                // most likely as a result of a binding initialising\n                run_all(new_on_destroy);\n            }\n            component.$$.on_mount = [];\n        });\n    }\n    after_update.forEach(add_render_callback);\n}\nfunction destroy_component(component, detaching) {\n    const $$ = component.$$;\n    if ($$.fragment !== null) {\n        run_all($$.on_destroy);\n        $$.fragment && $$.fragment.d(detaching);\n        // TODO null out other refs, including component.$$ (but need to\n        // preserve final state?)\n        $$.on_destroy = $$.fragment = null;\n        $$.ctx = [];\n    }\n}\nfunction make_dirty(component, i) {\n    if (component.$$.dirty[0] === -1) {\n        dirty_components.push(component);\n        schedule_update();\n        component.$$.dirty.fill(0);\n    }\n    component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));\n}\nfunction init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {\n    const parent_component = current_component;\n    set_current_component(component);\n    const $$ = component.$$ = {\n        fragment: null,\n        ctx: null,\n        // state\n        props,\n        update: noop,\n        not_equal,\n        bound: blank_object(),\n        // lifecycle\n        on_mount: [],\n        on_destroy: [],\n        on_disconnect: [],\n        before_update: [],\n        after_update: [],\n        context: new Map(parent_component ? parent_component.$$.context : options.context || []),\n        // everything else\n        callbacks: blank_object(),\n        dirty,\n        skip_bound: false\n    };\n    let ready = false;\n    $$.ctx = instance\n        ? instance(component, options.props || {}, (i, ret, ...rest) => {\n            const value = rest.length ? rest[0] : ret;\n            if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {\n                if (!$$.skip_bound && $$.bound[i])\n                    $$.bound[i](value);\n                if (ready)\n                    make_dirty(component, i);\n            }\n            return ret;\n        })\n        : [];\n    $$.update();\n    ready = true;\n    run_all($$.before_update);\n    // `false` as a special case of no DOM component\n    $$.fragment = create_fragment ? create_fragment($$.ctx) : false;\n    if (options.target) {\n        if (options.hydrate) {\n            start_hydrating();\n            const nodes = children(options.target);\n            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion\n            $$.fragment && $$.fragment.l(nodes);\n            nodes.forEach(detach);\n        }\n        else {\n            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion\n            $$.fragment && $$.fragment.c();\n        }\n        if (options.intro)\n            transition_in(component.$$.fragment);\n        mount_component(component, options.target, options.anchor, options.customElement);\n        end_hydrating();\n        flush();\n    }\n    set_current_component(parent_component);\n}\nlet SvelteElement;\nif (typeof HTMLElement === 'function') {\n    SvelteElement = class extends HTMLElement {\n        constructor() {\n            super();\n            this.attachShadow({ mode: 'open' });\n        }\n        connectedCallback() {\n            const { on_mount } = this.$$;\n            this.$$.on_disconnect = on_mount.map(run).filter(is_function);\n            // @ts-ignore todo: improve typings\n            for (const key in this.$$.slotted) {\n                // @ts-ignore todo: improve typings\n                this.appendChild(this.$$.slotted[key]);\n            }\n        }\n        attributeChangedCallback(attr, _oldValue, newValue) {\n            this[attr] = newValue;\n        }\n        disconnectedCallback() {\n            run_all(this.$$.on_disconnect);\n        }\n        $destroy() {\n            destroy_component(this, 1);\n            this.$destroy = noop;\n        }\n        $on(type, callback) {\n            // TODO should this delegate to addEventListener?\n            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));\n            callbacks.push(callback);\n            return () => {\n                const index = callbacks.indexOf(callback);\n                if (index !== -1)\n                    callbacks.splice(index, 1);\n            };\n        }\n        $set($$props) {\n            if (this.$$set && !is_empty($$props)) {\n                this.$$.skip_bound = true;\n                this.$$set($$props);\n                this.$$.skip_bound = false;\n            }\n        }\n    };\n}\n\n/* Settings.svelte generated by Svelte v3.38.3 */\n\nfunction create_else_block(ctx) {\n\tlet t;\n\n\treturn {\n\t\tc() {\n\t\t\tt = text(\"Loading...\");\n\t\t},\n\t\tm(target, anchor) {\n\t\t\tinsert(target, t, anchor);\n\t\t},\n\t\td(detaching) {\n\t\t\tif (detaching) detach(t);\n\t\t}\n\t};\n}\n\n// (7:4) {#if settings }\nfunction create_if_block(ctx) {\n\tlet t;\n\n\treturn {\n\t\tc() {\n\t\t\tt = text(\"Dont need custom settings...\");\n\t\t},\n\t\tm(target, anchor) {\n\t\t\tinsert(target, t, anchor);\n\t\t},\n\t\td(detaching) {\n\t\t\tif (detaching) detach(t);\n\t\t}\n\t};\n}\n\nfunction create_fragment(ctx) {\n\tlet div;\n\n\tfunction select_block_type(ctx, dirty) {\n\t\tif (/*settings*/ ctx[0]) return create_if_block;\n\t\treturn create_else_block;\n\t}\n\n\tlet current_block_type = select_block_type(ctx);\n\tlet if_block = current_block_type(ctx);\n\n\treturn {\n\t\tc() {\n\t\t\tdiv = element(\"div\");\n\t\t\tif_block.c();\n\t\t\tthis.c = noop;\n\t\t\tattr(div, \"class\", \"container\");\n\t\t},\n\t\tm(target, anchor) {\n\t\t\tinsert(target, div, anchor);\n\t\t\tif_block.m(div, null);\n\t\t},\n\t\tp(ctx, [dirty]) {\n\t\t\tif (current_block_type !== (current_block_type = select_block_type(ctx))) {\n\t\t\t\tif_block.d(1);\n\t\t\t\tif_block = current_block_type(ctx);\n\n\t\t\t\tif (if_block) {\n\t\t\t\t\tif_block.c();\n\t\t\t\t\tif_block.m(div, null);\n\t\t\t\t}\n\t\t\t}\n\t\t},\n\t\ti: noop,\n\t\to: noop,\n\t\td(detaching) {\n\t\t\tif (detaching) detach(div);\n\t\t\tif_block.d();\n\t\t}\n\t};\n}\n\nfunction instance($$self, $$props, $$invalidate) {\n\tlet { settings } = $$props;\n\n\t$$self.$$set = $$props => {\n\t\tif (\"settings\" in $$props) $$invalidate(0, settings = $$props.settings);\n\t};\n\n\treturn [settings];\n}\n\nclass Settings extends SvelteElement {\n\tconstructor(options) {\n\t\tsuper();\n\n\t\tinit(\n\t\t\tthis,\n\t\t\t{\n\t\t\t\ttarget: this.shadowRoot,\n\t\t\t\tprops: attribute_to_object(this.attributes),\n\t\t\t\tcustomElement: true\n\t\t\t},\n\t\t\tinstance,\n\t\t\tcreate_fragment,\n\t\t\tsafe_not_equal,\n\t\t\t{ settings: 0 }\n\t\t);\n\n\t\tif (options) {\n\t\t\tif (options.target) {\n\t\t\t\tinsert(options.target, this, options.anchor);\n\t\t\t}\n\n\t\t\tif (options.props) {\n\t\t\t\tthis.$set(options.props);\n\t\t\t\tflush();\n\t\t\t}\n\t\t}\n\t}\n\n\tstatic get observedAttributes() {\n\t\treturn [\"settings\"];\n\t}\n\n\tget settings() {\n\t\treturn this.$$.ctx[0];\n\t}\n\n\tset settings(settings) {\n\t\tthis.$set({ settings });\n\t\tflush();\n\t}\n}\n\nmodule.exports = Settings;\n//# sourceMappingURL=SettingsIcon.js.map\n";

class JuntoSettingsUI {
    settingsIcon() {
        return SettingsIcon;
    }
}

function interactions(expression) {
    return [];
}
const activeAgentDurationSecs = 300;
const name = "social-context";
async function create(context) {
    const Holochain = context.Holochain;
    const linksAdapter = new JuntoSocialContextLinkAdapter(context);
    const settingsUI = new JuntoSettingsUI();
    await Holochain.registerDNAs([{ file: DNA, nick: DNA_NICK }], (signal) => { linksAdapter.handleHolochainSignal(signal); });
    await linksAdapter.addActiveAgentLink(Holochain);
    setInterval(await linksAdapter.addActiveAgentLink.bind(Holochain), activeAgentDurationSecs * 1000);
    return {
        name,
        linksAdapter,
        settingsUI,
        interactions,
    };
}

exports.default = create;
exports.name = name;
//# sourceMappingURL=bundle.js.map