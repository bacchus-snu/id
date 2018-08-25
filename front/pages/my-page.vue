<template>
  <div>
    <change-account :emailList="emailList" :shellList="shellList"></change-account>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'nuxt-property-decorator'
import ChangeAccount from '~/components/ChangeAccount'
import axios from 'axios'

@Component({
  components: {
    'change-account': ChangeAccount,
  },
})
export default class MyAccountPage extends Vue {
  private shellList: Array<string> = []
  private emailList: Array<string> = []

  private async asyncData() {
    const result = await axios.get(process.env.baseUrl + '/api/shells', {
      validateStatus: () => true,
    })
    return { shellList : result.data.shells, emailList : ['example@gmail.com'] }
  }

}
</script>
