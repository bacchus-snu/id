<template>
  <div>
    <el-container direction="vertical">
      <el-row>
        <el-col
          class="title"
          :md="{span: 8}"
          :sm="{span: 8}"
          :xs="{span: 8}"
        >{{ groupAdministrationTrans[lang] }}</el-col>
        <el-col
          class="subtitle"
          :md="{span: 16}"
          :sm="{span: 16}"
          :xs="{span: 16}"
        >{{ attributeGroupTrans[lang] }}</el-col>
      </el-row>
      <el-card
        style="margin-top: 4%"
        :md="{span: 8, offset: 8}"
        :sm="{span: 8, offset: 8}"
        :xs="{span: 8, offset: 8}"
      >
        <el-container>
          <el-header class="smalltitle" align="center">{{ additionTitleTrans[lang] }}</el-header>
          <el-main>
            <el-table
              style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
              :data="ListView"
              border
              striped
              align="center"
              @selection-change="handleSelectionChange"
            >
              <el-table-column type="selection" width="50" align="center" ></el-table-column>
              <el-table-column type="index" width="80" :index="indexMethod" align="center"></el-table-column>
              <el-table-column prop="studentNumber" width="180" label="Student Number" align="center"></el-table-column>
              <el-table-column prop="name" label="Name" align="center"></el-table-column>
            </el-table>
            <el-pagination
              @current-change="handlePage"
              :current-page.sync="currentPage1"
              :page-size="20"
              layout="prev, pager, next, jumper"
              @total="sizeList(userList)"
            ></el-pagination>
          </el-main>
          <el-footer style="margin-top: 20px" align="center">
            <el-button @click="permit">{{ additionTrans[lang] }}</el-button>
            <el-button @click="reject">{{ rejectTrans[lang] }}</el-button>
          </el-footer>
        </el-container>
      </el-card>
      <el-card
        style="margin-top: 4%"
        :md="{span: 8, offset: 8}"
        :sm="{span: 8, offset: 8}"
        :xs="{span: 8, offset: 8}"
      >
        <el-container>
          <el-header class="smalltitle" align="center">{{ excludeTitleTrans[lang] }}</el-header>
          <el-main>
            <el-table
              style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
              :data="ListView2"
              border
              align="center"
              @selection-change="handleSelectionChange2"
            >
              <el-table-column type="selection" width="50" align="center" ></el-table-column>
              <el-table-column type="index" width="80" :index="indexMethod2" align="center"></el-table-column>
              <el-table-column prop="studentNumber" width="180" label="Student Number" align="center"></el-table-column>
              <el-table-column prop="name" label="Name" align="center"></el-table-column>
            </el-table>
            <el-pagination
              @current-change="handlePage2"
              :current-page.sync="currentPage2"
              :page-size="20"
              layout="prev, pager, next, jumper"
              @total="sizeList(userList2)"
            ></el-pagination>
          </el-main>
          <el-footer style="margin-top: 20px" align="center">
            <el-button @click="exclude">{{ excludeTrans[lang] }}</el-button>
          </el-footer>
        </el-container>
      </el-card>
    </el-container>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Provide } from "nuxt-property-decorator";
import axios from "axios";
import { Translation, Language } from "../types/translation";
import { UserGroup } from "../types/user";
import { ElTableColumn } from "element-ui/types/table-column";
import { ElTable } from "element-ui/types/table";

@Component({})
export default class GroupAdmin extends Vue {
  private UserList: UserGroup[];
  private UserList2: UserGroup[];
  private ListView: UserGroup[];
  private ListView2: UserGroup[];
  private gid;
  private currentPage1: number;
  private currentPage2: number;
  private multipleSelection1: UserGroup[];
  private multipleSelection2: UserGroup[];

  private readonly groupAdministrationTrans: Translation = {
    ko: "그룹관리",
    en: "Group Management"
  };

  private readonly attributeGroupTrans: Translation = {
    ko: "코인",
    en: "Coins"
  };

  private readonly additionTitleTrans: Translation = {
    ko: "그룹 멤버 추가",
    en: "Add Members"
  };

  private readonly excludeTitleTrans: Translation = {
    ko: "그룹 멤버 제외",
    en: "Exclude Members"
  };

  private readonly additionTrans: Translation = {
    ko: "승인",
    en: "Add"
  };

  private readonly rejectTrans: Translation = {
    ko: "거절",
    en: "Reject"
  };

  private readonly excludeTrans: Translation = {
    ko: "제외",
    en: "Exclude"
  };

  private readonly attributeStatusTrans: Translation = {
    ko: "상태",
    en: "status"
  };

  private readonly permissionFailedTrans: Translation = {
    ko: "그룹 멤버 추가에 실패했습니다.",
    en: "Failed to add a group member."
  };

  private readonly expelFailedTrans: Translation = {
    ko: "그룹 멤버 제외에 실패했습니다.",
    en: "Failed to exclude a group member."
  };

  get lang(): Language {
    return this.$store.state.language;
  }

  private async mounted() {
    this.gid = this.$route.params.gid;

    var response = await axios.get("/api/check-login", {
      validateStatus: () => true
    });

    if (response.status === 200) {
    } else {
      this.$router.push("/");
      return;
    }

    response = await axios.get("/api/group/" + this.gid + "/pending", {
      validateStatus: () => true
    });

    if (response.status === 401) {
      this.$router.push("/my-page");
      return;
    }

    this.currentPage1 = 1;

    if (response.data == []) {
    } else {
      this.UserList = response.data;
      this.handlePage();
    }

    response = await axios.get("/api/group/" + this.gid + "/members", {
      validateStatus: () => true
    });

    if (response.status === 401) {
      this.$router.push("/my-page");
      return;
    }

    this.currentPage2 = 1;

    if (response.data == []) {
    } else {
      this.UserList2 = response.data;
      this.handlePage2();
    }
  }

  private async permit() {
    console.log(this.multipleSelection1);

    var list: number[] = [];
    var i = 0;

    for(i = 0; i < list.length; i++)
    {
      list[i] = this.multipleSelection1[i].uid;
    }

    const response = await axios.post(
      "/api/group/" + this.gid + "/accept",
      list,
      {
        validateStatus: () => true
      }
    );

    if (response.status === 200) {
      this.$router.push("/group/" + this.gid);
    } else {
      this.$notify.error("Fail");
    }
  }

  private async reject() {
    console.log(this.multipleSelection1);

    var list: number[] = [];
    var i = 0;

    for(i = 0; i < list.length; i++)
    {
      list[i] = this.multipleSelection1[i].uid;
    }

    const response = await axios.post(
      "/api/group/" + this.gid + "/reject",
      this.multipleSelection1,
      {
        validateStatus: () => true
      }
    );

    if (response.status === 200) {
      this.$router.push("/group/" + this.gid);
    } else {
      this.$notify.error("Fail");
    }
  }

  private async exclude() {
    console.log(this.multipleSelection2);

    var list: number[] = [];
    var i = 0;

    for(i = 0; i < list.length; i++)
    {
      list[i] = this.multipleSelection2[i].uid;
    }

    const response = await axios.post(
      "/api/group/" + this.gid + "/reject",
      this.multipleSelection2,
      {
        validateStatus: () => true
      }
    );

    if (response.status === 200) {
      this.$router.push("/group/" + this.gid);
    } else {
      this.$notify.error("Fail");
    }
  }

  private async sizeList(list: UserGroup[]) {
    if (list === []) return 0;
    else return list.length;
  }

  private async handlePage() {
    if (this.currentPage1 * 20 >= this.UserList.length)
      this.ListView = this.UserList.slice((this.currentPage1 - 1) * 20);
    else {
      this.ListView = this.UserList.slice(
        (this.currentPage1 - 1) * 20,
        this.currentPage1 * 20
      );
    }
  }

  private async handlePage2() {
    if (this.currentPage2 * 20 >= this.UserList2.length)
      this.ListView2 = this.UserList2.slice((this.currentPage2 - 1) * 20);
    else {
      this.ListView2 = this.UserList2.slice(
        (this.currentPage2 - 1) * 20,
        this.currentPage2 * 20
      );
    }
  }

  data() {
    return {
      userList: this.UserList,
      userList2: this.UserList2,
      ListView: this.ListView,
      ListView2: this.ListView2,
      currentPage1: this.currentPage1,
      currentPage2: this.currentPage2,
      multipleSelection1: this.multipleSelection1,
      multipleSelection2: this.multipleSelection2,
      indexMethod: (index: number) => { return (this.currentPage1-1) * 20 + index + 1},
      indexMethod2: (index: number) => { return (this.currentPage2-1) * 20 + index + 1},
      handleSelectionChange: (val: UserGroup[]) => {this.multipleSelection1 = val; console.log(val)},
      handleSelectionChange2: (val: UserGroup[]) => {this.multipleSelection2 = val; console.log(val)},
    }
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

.title {
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  font-size: 24px;
  font-weight: 400;
  line-height: 60px;
  text-align: center;
  margin-top: 4%;
  background-color: orange;
  border-width: 1px;
  border-style: solid;
  border-color: orange;
  border-radius: 4px;
}

.subtitle {
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  font-size: 24px;
  font-weight: 400;
  line-height: 60px;
  text-align: center;
  margin-top: 4%;
  border-color: orange;
  border-width: 1px;
  border-style: solid;
  background-color: rgba(255, 170, 0, 0.4);
  border-radius: 4px;
}

.smalltitle {
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  font-size: 24px;
  font-weight: 400;
  line-height: 60px;
  text-align: center;
  background-color: rgba(255, 255, 0, 0.7);
  border-color: rgb(255, 255, 0);
  border-width: 1px;
  border-style: solid;
  border-radius: 4px;
}

.account {
  margin-top: 8%;
  text-align: center;
  vertical-align: middle;
  margin-right: 20px;
  margin-left: 20px;
}
</style>
