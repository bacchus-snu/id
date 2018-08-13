export const state = () => ({
  language: 'ko',
  menu: [true, false, false, false] //caution : number of menus fixed as 4
})

export const mutations = {
  changeLang(state) {
    if (state.language === 'ko') {
      state.language = 'en'
    }
    else {
      state.language = 'ko'
    }
  },
  selectMenu(state, selected) {
    for (var i=0; i<state.menu.length; i++){
      state.menu[i] = false
    }
    state.menu[selected] = true
  }
}


