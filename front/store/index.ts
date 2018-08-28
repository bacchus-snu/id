export const state = () => ({
  language: 'ko',
  username: '',
  email: {
    emailLocal: '',
    emailDomain: '',
  },
})

export const mutations = {
  changeLang(state) {
    if (state.language === 'ko') {
      state.language = 'en'
    } else {
      state.language = 'ko'
    }
  },

  changeUsername(state, username: string) {
    state.username = username
  },

  changeEmail(state, { emailLocal, emailDomain }) {
    state.email.emailLocal = emailLocal
    state.email.emailDomain = emailDomain
  },
}
