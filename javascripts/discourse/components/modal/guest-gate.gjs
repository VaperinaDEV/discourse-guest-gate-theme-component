import Component from "@glimmer/component";
import { fn } from "@ember/helper";
import { on } from "@ember/modifier";
import { action } from "@ember/object";
import { service } from "@ember/service";
import { htmlSafe } from "@ember/template";
import concatClass from "discourse/helpers/concat-class";
import routeAction from "discourse/helpers/route-action";
import replaceEmoji from "discourse/helpers/replace-emoji";
import DButton from "discourse/components/d-button";
import DModal from "discourse/components/d-modal";
import LoginButtons from "discourse/components/login-buttons";
import { i18n } from "discourse-i18n";
import { trackGuestGateEvent } from "../../lib/guest-gate-analytics";

export default class GuestGateModal extends Component {
  @service siteSettings;
  @service login;

  get isCustomGate() {
    return settings.custom_gate_enabled;
  }

  get hasCustomImage() {
    return Boolean(settings.custom_gate_image);
  }

  get guestGateModalTitle() {
    return i18n(themePrefix("guest_gate.title"));
  }

  get customBigText() {
    return htmlSafe(i18n(themePrefix("custom_gate.big_text")));
  }

  get customLittleText() {
    return htmlSafe(i18n(themePrefix("custom_gate.little_text")));
  }

  get customImageAlt() {
    return settings.custom_gate_image_alt || i18n(themePrefix("custom_gate.image_alt"));
  }

  get modalSize() {
    return settings.gate_modal_size || "standard";
  }

  get bodyAlignment() {
    return settings.gate_body_alignment || "center";
  }

  get modalClass() {
    return concatClass(
      "gate",
      this.isCustomGate ? "custom-gate" : null,
      `gate-size-${this.modalSize}`,
      `gate-align-${this.bodyAlignment}`
    );
  }

  get signupCtaIntro() {
    return replaceEmoji(i18n("signup_cta.intro"));
  }

  get signupCtaValueProp() {
    return replaceEmoji(i18n("signup_cta.value_prop"));
  }

  get guestGateLogin() {
    return i18n(themePrefix("guest_gate.log_in"));
  }

  get guestGateSignup() {
    return i18n(themePrefix("guest_gate.sign_up"));
  }

  get guestGateSsoLogin() {
    return i18n(themePrefix("guest_gate.sso_log_in"));
  }

  get guestGateSsoSignup() {
    return i18n(themePrefix("guest_gate.sso_sign_up"));
  }

  get guestGateOr() {
    return i18n(themePrefix("guest_gate.or"));
  }

  get usesDiscourseConnect() {
    return this.siteSettings.enable_discourse_connect;
  }

  get hasDiscourseConnectSignup() {
    return this.usesDiscourseConnect && settings.enable_discourse_connect_signup;
  }

  get usesCustomUrls() {
    return settings.custom_url_enabled;
  }

  get usesButtons() {
    return settings.use_gate_buttons;
  }

  @action
  externalLogin(provider) {
    this.trackClick(`external_${provider.name || provider}`);

    // External providers are started in account-creation context, matching
    // Discourse's LoginButtons behavior for guests.
    this.login.externalLogin(provider, { signup: true });
  }

  @action
  trackClick(clickAction) {
    trackGuestGateEvent("guest_gate_click", {
      guest_gate_click_action: clickAction,
      guest_gate_reason: this.args.model?.reason,
      guest_gate_path: this.args.model?.path,
    });
  }

  @action
  trackAndRun(routeActionFn, clickAction) {
    this.trackClick(clickAction);
    routeActionFn?.();
  }

  @action
  trackedCloseModal() {
    this.trackClick("dismiss");
    this.args.closeModal();
  }

  <template>
    <DModal
      @closeModal={{this.trackedCloseModal}}
      @title={{this.guestGateModalTitle}}
      @dismissable={{settings.dismissable}}
      class={{this.modalClass}}
    >
      <:body>
        {{#if this.isCustomGate}}
          <div class="custom-gate-content">
            {{#if this.hasCustomImage}}
              <img
                src={{settings.custom_gate_image}}
                alt={{this.customImageAlt}}
                loading="lazy"
                decoding="async"
              />
            {{/if}}

            <h2>{{this.customBigText}}</h2>
            <div class="custom-gate-little-text">{{this.customLittleText}}</div>
          </div>
        {{else}}
          <div class="guest-gate-copy">
            <p>{{this.signupCtaIntro}}</p>
            <p>{{this.signupCtaValueProp}}</p>
          </div>
        {{/if}}

        <LoginButtons
          @externalLogin={{this.externalLogin}}
          @context="create-account"
        />
      </:body>

      <:footer>
        {{#if this.usesDiscourseConnect}}
          {{#if this.usesButtons}}
            <DButton
              @class={{settings.login_button_style}}
              @icon={{settings.login_icon}}
              @translatedLabel={{this.guestGateSsoLogin}}
              @action={{fn this.trackAndRun (routeAction "showLogin") "sso_login"}}
            />

            {{#if this.hasDiscourseConnectSignup}}
              <DButton
                @class={{settings.signup_button_style}}
                @icon={{settings.signup_icon}}
                @translatedLabel={{this.guestGateSsoSignup}}
                @href={{settings.discourse_connect_signup_url}}
                {{on "click" (fn this.trackClick "sso_signup")}}
              />
            {{/if}}
          {{else}}
            <DButton
              @class="btn-transparent"
              @translatedLabel={{this.guestGateSsoLogin}}
              @action={{fn this.trackAndRun (routeAction "showLogin") "sso_login"}}
            />

            {{#if this.hasDiscourseConnectSignup}}
              {{this.guestGateOr}}
              <DButton
                @class="btn-transparent"
                @translatedLabel={{this.guestGateSsoSignup}}
                @href={{settings.discourse_connect_signup_url}}
                {{on "click" (fn this.trackClick "sso_signup")}}
              />
            {{/if}}
          {{/if}}
        {{else if this.usesButtons}}
          {{#if this.usesCustomUrls}}
            <DButton
              @class={{settings.login_button_style}}
              @icon={{settings.login_icon}}
              @translatedLabel={{this.guestGateLogin}}
              @href={{settings.custom_login_url}}
              {{on "click" (fn this.trackClick "login")}}
            />
            <DButton
              @class={{settings.signup_button_style}}
              @icon={{settings.signup_icon}}
              @translatedLabel={{this.guestGateSignup}}
              @href={{settings.custom_signup_url}}
              {{on "click" (fn this.trackClick "signup")}}
            />
          {{else}}
            <DButton
              @class={{settings.login_button_style}}
              @icon={{settings.login_icon}}
              @translatedLabel={{this.guestGateLogin}}
              @action={{fn this.trackAndRun (routeAction "showLogin") "login"}}
            />
            <DButton
              @class={{settings.signup_button_style}}
              @icon={{settings.signup_icon}}
              @translatedLabel={{this.guestGateSignup}}
              @action={{fn this.trackAndRun (routeAction "showCreateAccount") "signup"}}
            />
          {{/if}}
        {{else}}
          {{#if this.usesCustomUrls}}
            <DButton
              @class="btn-transparent"
              @translatedLabel={{this.guestGateLogin}}
              @href={{settings.custom_login_url}}
              {{on "click" (fn this.trackClick "login")}}
            />
            {{this.guestGateOr}}
            <DButton
              @class="btn-transparent"
              @translatedLabel={{this.guestGateSignup}}
              @href={{settings.custom_signup_url}}
              {{on "click" (fn this.trackClick "signup")}}
            />
          {{else}}
            <DButton
              @class="btn-transparent"
              @translatedLabel={{this.guestGateLogin}}
              @action={{fn this.trackAndRun (routeAction "showLogin") "login"}}
            />
            {{this.guestGateOr}}
            <DButton
              @class="btn-transparent"
              @translatedLabel={{this.guestGateSignup}}
              @action={{fn this.trackAndRun (routeAction "showCreateAccount") "signup"}}
            />
          {{/if}}
        {{/if}}
      </:footer>
    </DModal>
  </template>
}
