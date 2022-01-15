/* eslint-disable */
/* tslint:disable */
/**
 * This is an autogenerated file created by the Stencil compiler.
 * It contains typing information for all components that exist in this project.
 */
import { HTMLStencilElement, JSXBase } from "@stencil/core/internal";
import { MatchResults, RouterHistory } from "@stencil/router";
export namespace Components {
    interface KtEditPage {
        "history": RouterHistory;
        "match": MatchResults;
    }
    interface KtIndexPage {
        "history": RouterHistory;
    }
    interface KtRoot {
    }
    interface KtStudyPage {
        "history": RouterHistory;
        "match": MatchResults;
    }
}
declare global {
    interface HTMLKtEditPageElement extends Components.KtEditPage, HTMLStencilElement {
    }
    var HTMLKtEditPageElement: {
        prototype: HTMLKtEditPageElement;
        new (): HTMLKtEditPageElement;
    };
    interface HTMLKtIndexPageElement extends Components.KtIndexPage, HTMLStencilElement {
    }
    var HTMLKtIndexPageElement: {
        prototype: HTMLKtIndexPageElement;
        new (): HTMLKtIndexPageElement;
    };
    interface HTMLKtRootElement extends Components.KtRoot, HTMLStencilElement {
    }
    var HTMLKtRootElement: {
        prototype: HTMLKtRootElement;
        new (): HTMLKtRootElement;
    };
    interface HTMLKtStudyPageElement extends Components.KtStudyPage, HTMLStencilElement {
    }
    var HTMLKtStudyPageElement: {
        prototype: HTMLKtStudyPageElement;
        new (): HTMLKtStudyPageElement;
    };
    interface HTMLElementTagNameMap {
        "kt-edit-page": HTMLKtEditPageElement;
        "kt-index-page": HTMLKtIndexPageElement;
        "kt-root": HTMLKtRootElement;
        "kt-study-page": HTMLKtStudyPageElement;
    }
}
declare namespace LocalJSX {
    interface KtEditPage {
        "history"?: RouterHistory;
        "match"?: MatchResults;
    }
    interface KtIndexPage {
        "history"?: RouterHistory;
    }
    interface KtRoot {
    }
    interface KtStudyPage {
        "history"?: RouterHistory;
        "match"?: MatchResults;
    }
    interface IntrinsicElements {
        "kt-edit-page": KtEditPage;
        "kt-index-page": KtIndexPage;
        "kt-root": KtRoot;
        "kt-study-page": KtStudyPage;
    }
}
export { LocalJSX as JSX };
declare module "@stencil/core" {
    export namespace JSX {
        interface IntrinsicElements {
            "kt-edit-page": LocalJSX.KtEditPage & JSXBase.HTMLAttributes<HTMLKtEditPageElement>;
            "kt-index-page": LocalJSX.KtIndexPage & JSXBase.HTMLAttributes<HTMLKtIndexPageElement>;
            "kt-root": LocalJSX.KtRoot & JSXBase.HTMLAttributes<HTMLKtRootElement>;
            "kt-study-page": LocalJSX.KtStudyPage & JSXBase.HTMLAttributes<HTMLKtStudyPageElement>;
        }
    }
}
