import { Component, h, Host } from '@stencil/core';
import { store } from '../../model';

@Component({
  tag: 'kt-root'
})
export class KtRoot {
  async componentWillLoad() {
    await store.initialize();
  }

  render() {
    return (
      <Host>
        <stencil-router historyType="hash">
          <stencil-route-switch scrollTopOffset={0}>
            <stencil-route url="/" component="kt-index-page" exact={true} />
            <stencil-route url="/study/:deckID" component="kt-study-page" />
            <stencil-route url="/edit/:deckID" component="kt-edit-page" />
          </stencil-route-switch>
        </stencil-router>
      </Host>
    );
  }
}