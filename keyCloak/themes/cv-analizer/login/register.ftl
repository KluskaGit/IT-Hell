<#import "template.ftl" as layout>

<@layout.registrationLayout displayMessage=false; section>
  <#if section = "header">
    ${msg("registerTitle")}
  <#elseif section = "form">

    <div class="background-glow">
      <div class="glow-1"></div>
      <div class="glow-2"></div>
    </div>

    <div class="auth-wrapper animate-fadeIn auth-wrapper-register">

      <div class="auth-header">
        <a href="${url.loginUrl}" class="logo-link">
          <div class="logo-icon"></div>
          <span class="logo-text">CV<span class="logo-accent">_ANALIZER</span></span>
        </a>
      </div>

      <div class="auth-card">
        <div class="card-header">
          <h2>Załóż konto</h2>
          <p>Dołącz i znajdź idealne oferty IT</p>
        </div>

        <#if message?has_content>
          <div class="kc-feedback <#if message.type = 'error'>error<#else>${message.type}</#if>">
            ${kcSanitize(message.summary)?no_esc}
          </div>
        </#if>

        <form id="kc-register-form" class="login-form" action="${url.registrationAction}" method="post">

          <div class="input-group">
            <label for="firstName">Imię</label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value="${(register.formData.firstName!'')}"
              autocomplete="given-name"
              placeholder="Wpisz swoje imię"
              aria-invalid="<#if messagesPerField.existsError('firstName')>true<#else>false</#if>"
            />
            <#if messagesPerField.existsError('firstName')>
              <span class="input-error">${kcSanitize(messagesPerField.get('firstName'))?no_esc}</span>
            </#if>
          </div>

          <div class="input-group">
            <label for="lastName">Nazwisko</label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value="${(register.formData.lastName!'')}"
              autocomplete="family-name"
              placeholder="Wpisz swoje nazwisko"
              aria-invalid="<#if messagesPerField.existsError('lastName')>true<#else>false</#if>"
            />
            <#if messagesPerField.existsError('lastName')>
              <span class="input-error">${kcSanitize(messagesPerField.get('lastName'))?no_esc}</span>
            </#if>
          </div>

          <div class="input-group">
            <label for="email">Adres e-mail</label>
            <input
              type="email"
              id="email"
              name="email"
              value="${(register.formData.email!'')}"
              autocomplete="email"
              placeholder="Wpisz swój e-mail"
              aria-invalid="<#if messagesPerField.existsError('email')>true<#else>false</#if>"
            />
            <#if messagesPerField.existsError('email')>
              <span class="input-error">${kcSanitize(messagesPerField.get('email'))?no_esc}</span>
            </#if>
          </div>

          <div class="input-group">
            <label for="password">Hasło</label>
            <input
              type="password"
              id="password"
              name="password"
              autocomplete="new-password"
              placeholder="Minimum 6 znaków"
              aria-invalid="<#if messagesPerField.existsError('password')>true<#else>false</#if>"
            />
            <#if messagesPerField.existsError('password')>
              <span class="input-error">${kcSanitize(messagesPerField.get('password'))?no_esc}</span>
            </#if>
          </div>

          <div class="input-group">
            <label for="password-confirm">Powtórz hasło</label>
            <input
              type="password"
              id="password-confirm"
              name="password-confirm"
              autocomplete="new-password"
              placeholder="Powtórz hasło"
              aria-invalid="<#if messagesPerField.existsError('password-confirm')>true<#else>false</#if>"
            />
            <#if messagesPerField.existsError('password-confirm')>
              <span class="input-error">${kcSanitize(messagesPerField.get('password-confirm'))?no_esc}</span>
            </#if>
          </div>

          <button class="submit-button" type="submit">
            Zarejestruj się
          </button>
        </form>

        <div class="card-footer">
          Masz już konto?
          <a href="${url.loginUrl}" class="register-link">Zaloguj się</a>
        </div>
      </div>
    </div>
  </#if>
</@layout.registrationLayout>