<#import "template.ftl" as layout>

<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username','password') displayInfo=false; section>
  <#if section = "title">
    Zaloguj się
  <#elseif section = "header">
  <#elseif section = "form">
    <div class="background-glow">
      <div class="glow-1"></div>
      <div class="glow-2"></div>
    </div>

    <div class="auth-wrapper animate-fadeIn">
      <div class="auth-header">
        <a href="http://localhost:4200/" class="logo-link">
          <div class="logo-icon"></div>
          <span class="logo-text">CV<span class="logo-accent">_ANALIZER</span></span>
        </a>
      </div>

      <div class="auth-card">
        <div class="card-header">
          <h2>Zaloguj się</h2>
          <p>Wybierz preferowaną metodę logowania</p>
        </div>

        <#if social?? && social.providers?? && (social.providers?size > 0)>
          <div class="social-login-group">
            <#list social.providers as p>
              <a id="social-${p.alias}" class="social-btn btn-social" href="${p.loginUrl}">
                <#if p.alias?lower_case == "google">
                  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/google/google-original.svg" alt="Google" width="20" height="20">
                  <span>Zaloguj się przez Google</span>
                <#elseif p.alias?lower_case == "github">
                  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/github/github-original.svg" alt="GitHub" width="20" height="20">
                  <span>Zaloguj się przez GitHub</span>
                <#elseif p.alias?lower_case == "linkedin" || p.alias?lower_case == "linkedin-openid-connect">
                  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/linkedin/linkedin-original.svg" alt="LinkedIn" width="20" height="20">
                  <span>Zaloguj się przez LinkedIn</span>
                <#else>
                  <span>Zaloguj się przez ${p.displayName!p.alias}</span>
                </#if>
              </a>
            </#list>
          </div>
        </#if>

        <div class="divider">
          <span>LUB UŻYJ E-MAILA</span>
        </div>

        <form id="kc-form-login" action="${url.loginAction}" method="post" class="login-form">
          <div class="input-group">
            <label for="username">Adres e-mail</label>
            <input
              id="username"
              name="username"
              type="text"
              value="${(login.username!'')}"
              autocomplete="username"
              autofocus
              placeholder="Wpisz swój e-mail"
              aria-invalid="<#if messagesPerField.existsError('username','password')>true<#else>false</#if>"
            >
          </div>

          <div class="input-group">
            <div class="label-row">
              <label for="password">Hasło</label>
              <#if realm.resetPasswordAllowed>
                <a tabindex="5" href="${url.loginResetCredentialsUrl}" class="forgot-password">
                  Zapomniałeś hasła?
                </a>
              </#if>
            </div>

            <input
              id="password"
              name="password"
              type="password"
              autocomplete="current-password"
              placeholder="Wpisz hasło"
              aria-invalid="<#if messagesPerField.existsError('username','password')>true<#else>false</#if>"
            >
          </div>

          <#if messagesPerField.existsError('username','password')>
            <div class="kc-error-message">
              ${kcSanitize(message.summary)?no_esc}
            </div>
          </#if>

          <#if realm.rememberMe && !usernameHidden??>
            <div class="remember-me-row">
              <label class="remember-me-label">
                <input id="rememberMe" name="rememberMe" type="checkbox" <#if login.rememberMe??>checked</#if>>
                <span>Zapamiętaj mnie</span>
              </label>
            </div>
          </#if>

          <input type="hidden" id="id-hidden-input" name="credentialId" <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>>

          <button class="submit-button" name="login" id="kc-login" type="submit">
            Zaloguj się
          </button>
        </form>

        <#if realm.password && realm.registrationAllowed>
          <div class="card-footer">
            Nie masz jeszcze konta?
            <a href="${url.registrationUrl}" class="register-link">Zarejestruj się</a>
          </div>
        </#if>
      </div>
    </div>
  </#if>
</@layout.registrationLayout>