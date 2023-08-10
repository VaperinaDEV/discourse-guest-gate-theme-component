import Component from "@glimmer/component";
import { action } from "@ember/object";
import getURL from "discourse-common/lib/get-url";
import showModal from "discourse/lib/show-modal";
import { getOwner } from "discourse-common/lib/get-owner";

export default class extends Component {
  
  @action
  showLoginGate(event) {
    event?.preventDefault();
    showModal("login");
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
    });
  }
  
  @action
  externalLogin(provider) {
    getOwner(this).lookup("controller:login").send('externalLogin', provider);
  }
  
}
