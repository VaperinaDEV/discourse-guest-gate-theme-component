import ModalFunctionality from 'discourse/mixins/modal-functionality';
import { setting } from 'discourse/lib/computed';
import { action } from "@ember/object";
import showModal from "discourse/lib/show-modal";
import getURL from "discourse-common/lib/get-url";

export default Ember.Controller.extend(ModalFunctionality, {
  login: Ember.inject.controller(),

  ssoEnabled: setting('enable_discourse_connect'),

  actions: {
    externalLogin(provider) {
      this.get('login').send('externalLogin', provider);
    }
  },

  @action
  showLoginGate(event) {
    event?.preventDefault();
    showModal("login");
  },

  @action
  ssoLoginGate(event) {
    event?.preventDefault();
    const returnPath = encodeURIComponent(window.location.pathname);
    window.location = getURL("/session/sso?return_path=" + returnPath);
  },

  @action
  showCreateAccountGate(event) {
    event?.preventDefault();
    showModal("createAccount", {
      modalClass: "create-account",
    });
  },
});
