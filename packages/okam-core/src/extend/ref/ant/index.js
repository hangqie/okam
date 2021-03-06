/**
 * @file Support $refs property to get the reference instance in template for ant mini program
 *       `selectComponent` API is not supported in ant app, so here implementation
 *       uses the `$page` page instance to cache component instance.
 * @author sparklewhy@gmail.com
 */

'use strict';

import {normalizeExtendProp} from '../../../helper/methods';

const REF_DATA_ATTR = 'data-okam-ref';

/**
 * Query the reference instance information by the given reference class
 *
 * @inner
 * @param {string} selector the reference class or id selector
 * @param {boolean} isSelectAll whether is select all
 * @param {?Array|Object} componentInstances the component instances
 * @return {?Object|Array}
 */
function queryRefInstance(selector, isSelectAll, componentInstances) {
    let result = componentInstances;
    if (isSelectAll) {
        if (!result || !result.length) {
            result = this.$selector.selectAll(selector);
        }
    }
    else if (!result) {
        // if not custom component, try to query element info by selector API
        result = this.$selector.select(selector);
    }

    return result;
}

/**
 * Initialize the `$refs` value
 *
 * @inner
 */
function initRefs() {
    this.$refs = {};

    let refs = this.$rawRefData;
    if (typeof refs === 'function') {
        refs = refs();
    }

    if (!refs) {
        return;
    }

    let refInfo = this.props && this.props[REF_DATA_ATTR];
    let pageInstance = this.$page || this;
    let refComponents = pageInstance.__refComponents /* istanbul ignore next */ || {};
    pageInstance.__refComponents = refComponents;

    if (refInfo) {
        if (refInfo.charAt(0) === '[') {
            refComponents[refInfo] /* istanbul ignore next */ || (refComponents[refInfo] = []);
            refComponents[refInfo].push(this);
        }
        else {
            refComponents[refInfo] = this;
        }
    }

    let result = {};
    const self = this;
    Object.keys(refs).forEach(id => {
        result[id] = {
            get() {
                let value = refs[id];
                let isSelectAll = Array.isArray(value);
                isSelectAll && (value = value[0]);
                let key = isSelectAll ? `[]${value}` : value;
                return queryRefInstance.call(
                    self, value, isSelectAll, refComponents[key]
                );
            },
            enumerable: true
        };
    });

    Object.defineProperties(this.$refs, result);
}

export default {
    component: {

        /**
         * The instance initialization before the instance is normalized and created.
         *
         * @param {boolean} isPage whether is page component
         * @param {Object=} options the extra init options
         * @param {Object=} options.refs the component reference used in the
         *        component, the reference information is defined in the template
         * @private
         */
        $init(isPage, options) {
            let refData = options && options.refs;
            if (!refData) {
                return;
            }

            this._refData = refData;
            normalizeExtendProp(this, '_refData', '$rawRefData', isPage);
        },

        /**
         * The created hook
         *
         * @private
         */
        created() {
            // init component refs
            initRefs.call(this);
        },

        /**
         * The hook when component detached
         *
         * @private
         */
        detached() {
            this.$refs = null;

            let pageInstance = this.$page;
            if (!pageInstance) {
                // process page unload
                this.__refComponents = null;
                return;
            }

            // process component detached
            let refInfo = this.props && this.props[REF_DATA_ATTR];
            if (!refInfo) {
                return;
            }

            let refComponents = pageInstance.__refComponents;
            if (refComponents) {
                let result = refComponents[refInfo];
                if (Array.isArray(result)) {
                    let idx = result.indexOf(this);
                    if (idx !== -1) {
                        result.splice(idx, 1);
                    }
                }
                else /* istanbul ignore next */ if (result) {
                    delete refComponents[refInfo];
                }
            }
        }
    }
};
