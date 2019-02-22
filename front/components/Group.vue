<template>
  <div>
    <h1 class="groupAdministration">{{ groupAdministrationTrans[lang] }}</h1>
    <el-table :data="groupList" height="250" style="width: 100%">
      <el-table-column prop="groupName" label="Group Name" width="180"></el-table-column>
      <el-table-column label="Status" width="180">
        <template slot-scope="slotProps">
          <el-button v-if="slotProps.row.isPending" disabled size="mini" @click="applyGroup(groupId)">Pending</el-button>
          <el-button v-else-if="slotProps.row.isMember" size="mini" type="danger" @click="leaveGroup(groupId)">Leave</el-button>
          <el-button v-else size="mini" @click="applyGroup(groupId)">Apply</el-button>
        </template>
      </el-table-column>
      <el-table-column label="Ownership" width="180">
        <template slot-scope="slotProps">
          <el-button v-if="slotProps.row.isOwner" size="mini" @click="GroupOwnership(groupId)">GroupAdministration</el-button>
        </template>
      </el-table-column>
      <el-table-column prop="explanation" label="Explanation"></el-table-column>
    </el-table>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Provide } from "nuxt-property-decorator";
import axios from "axios";
import { Translation, Language } from "../types/translation";

@Component({})
export default class Group extends Vue {
  private groupList;

  private readonly groupAdministrationTrans: Translation = {
    ko: "그룹관리",
    en: "Group Administration"
  };

  private readonly attributeGroupTrans: Translation = {
    ko: "그룹명",
    en: "Group Name"
  };

  private readonly attributeStatusTrans: Translation = {
    ko: "상태",
    en: "status"
  };

  private readonly attributeExplanationTrans: Translation = {
    ko: "설명",
    en: "Explanation"
  };

  private readonly applyFailedTrans: Translation = {
    ko: "신청에 실패했습니다.",
    en: "Apply failed."
  };

  private readonly leaveFailedTrans: Translation = {
    ko: "탈퇴에 실패했습니다.",
    en: "Leave failed"
  };

  get lang(): Language {
    return this.$store.state.language;
  }

  private async mounted() {
    const response = await axios.get("/api/check-login", {
      validateStatus: () => true
    });

    if (response.status === 200) {
      return;
    } else {
      this.$router.push('/')
    }

    this.groupList = await axios.get("/api/get-group", {
      validateStatus: () => true
    });
  }

  private async applyGroup(groupId: number) {
    const response = await axios.post("/api/applyGroup");
    if (response.status === 200) {
      this.$router.push("/group");
    } else {
      this.$notify.error(this.applyFailedTrans[this.lang]);
      return;
    }
  }

  private async leaveGroup(groupId: number) {
    const response = await axios.post("/api/leaveGroup");
    if (response.status === 200) {
      this.$router.push("/group");
    } else {
      this.$notify.error(this.leaveFailedTrans[this.lang]);
      return;
    }
  }

  data() {
    return {
      groupList: [
        {
          groupName: "2016-05-03",
          explanation: "Tom",
          isPending: false,
          isOwner: false,
          isMember: false,
          groupID: 123,
          userID: 1231
        },
        {
          groupName: "2016-05-03",
          explanation: "Tom",
          isPending: true,
          isOwner: false,
          isMember: false,
          groupID: 123,
          userID: 1231
        },
        {
          groupName: "2016-05-03",
          explanation: "Tom",
          isPending: false,
          isOwner: true,
          isMember: false,
          groupID: 123,
          userID: 1231
        },
        {
          groupName: "2016-05-03",
          explanation: "Tom",
          isPending: false,
          isOwner: false,
          isMember: true,
          groupID: 123,
          userID: 1231
        }
      ]
    };
  }
}
</script>

<style scoped>
.groupAdministration {
  font-size: 32px;
  font-weight: 500;
  line-height: 40px;
  text-align: center;
  margin-top: 4%;
}
</style>
