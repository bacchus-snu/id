<template>
  <div>
    <my-page :emailList="emailList" :shellList="shellList"></my-page>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'nuxt-property-decorator'
import MyPage from '~/components/MyPage'
import axios from 'axios'
import { EmailAddress } from '~/types/user'

@Component({
  components: {
    'my-page': MyPage,
  },
})
export default class MyAccountPage extends Vue {
  private shellList: Array<string> = []
  private emailList: Array<EmailAddress> = []

  private async asyncData({ store }) {
    const result = await axios.get(process.env.baseUrl + '/api/shells', {
      validateStatus: () => true,
    })
    const response = await axios.get(process.env.baseUrl + '/api/user/emails',
      { validateStatus: () => true })
    return { shellList : result.data.shells, emailList : response.data.emails }
  }

}
</script>
