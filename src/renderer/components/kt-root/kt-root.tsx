import { Component, h, Host } from '@stencil/core';

@Component({
  tag: 'kt-root'
})
export class KtRoot {
  render() {
    return (
      <Host>
        <stencil-router historyType="hash">
          <stencil-route-switch scrollTopOffset={0}>
            <stencil-route url="/" component="kt-index-page" exact={true} />
            <stencil-route url="/study/:deckID" component="kt-study-page" />
            <stencil-route url="/edit/:deckID" component="kt-edit-page" />
            <stencil-route url="/stats/:deckID" component="kt-stats-page" />
          </stencil-route-switch>
        </stencil-router>
      </Host>
    );
  }
}