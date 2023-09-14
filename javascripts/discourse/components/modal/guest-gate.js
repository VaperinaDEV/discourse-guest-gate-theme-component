import Component from "@glimmer/component";
import { action } from "@ember/object";
import getURL from "discourse-common/lib/get-url";
import LoginModal from "discourse/components/modal/login";
import showModal from "discourse/lib/show-modal";
import { getOwner } from "discourse-common/lib/get-owner";
import { inject as service } from "@ember/service";

export default class extends Component {
  @service modal;
  
  @action
  showLoginGate(event) {
    event?.preventDefault();
    this.modal.show(LoginModal, {
      model: {
        showNotActivated: (props) => getOwner(this).lookup("controller:application").send("showNotActivated", props),
        showCreateAccount: (props) => getOwner(this).lookup("controller:application").send("showCreateAccount", props),
        canSignUp: getOwner(this).lookup("controller:application").canSignUp,
      },
    });
  }
    
  @action
  ssoLoginGate(event) {
    event?.preventDefault();
    const returnPath = encodeURIComponent(window.location.pathname);
    window.location = getURL("/session/sso?return_path=" + returnPath);
  }
    
  @action
  showCreateAccountGate(event) {
    event?.preventDefault();
    showModal("createAccount", {
      modalClass: "create-account",
      titleAriaElementId: "create-account-title",
    });
  }
  
  @action
  externalLogin(provider) {
    // we will automatically redirect to the external auth service
    this.modal.show(LoginModal, {
      model: {
        isExternalLogin: true,
        externalLoginMethod: provider,
        signup: true,
      },
    });
  }
}
