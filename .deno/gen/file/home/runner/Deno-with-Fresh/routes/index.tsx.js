/** @jsx h */ import { h } from "preact";
import { tw } from "@twind";
import Counter from "../islands/Counter.tsx";
export default function Home() {
    return /*#__PURE__*/ h("div", {
        class: tw`p-4 mx-auto max-w-screen-md`
    }, /*#__PURE__*/ h("img", {
        src: "/logo.svg",
        height: "100px",
        alt: "the fresh logo: a sliced lemon dripping with juice"
    }), /*#__PURE__*/ h("p", {
        class: tw`my-6`
    }, "Welcome to `fresh`. Try updating this message in the ./routes/index.tsx file, and refresh."), /*#__PURE__*/ h(Counter, {
        start: 3
    }));
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vaG9tZS9ydW5uZXIvRGVuby13aXRoLUZyZXNoL3JvdXRlcy9pbmRleC50c3giXSwic291cmNlc0NvbnRlbnQiOlsiLyoqIEBqc3ggaCAqL1xuaW1wb3J0IHsgaCB9IGZyb20gXCJwcmVhY3RcIjtcbmltcG9ydCB7IHR3IH0gZnJvbSBcIkB0d2luZFwiO1xuaW1wb3J0IENvdW50ZXIgZnJvbSBcIi4uL2lzbGFuZHMvQ291bnRlci50c3hcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gSG9tZSgpIHtcbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzPXt0d2BwLTQgbXgtYXV0byBtYXgtdy1zY3JlZW4tbWRgfT5cbiAgICAgIDxpbWdcbiAgICAgICAgc3JjPVwiL2xvZ28uc3ZnXCJcbiAgICAgICAgaGVpZ2h0PVwiMTAwcHhcIlxuICAgICAgICBhbHQ9XCJ0aGUgZnJlc2ggbG9nbzogYSBzbGljZWQgbGVtb24gZHJpcHBpbmcgd2l0aCBqdWljZVwiXG4gICAgICAvPlxuICAgICAgPHAgY2xhc3M9e3R3YG15LTZgfT5cbiAgICAgICAgV2VsY29tZSB0byBgZnJlc2hgLiBUcnkgdXBkYXRpbmcgdGhpcyBtZXNzYWdlIGluIHRoZSAuL3JvdXRlcy9pbmRleC50c3hcbiAgICAgICAgZmlsZSwgYW5kIHJlZnJlc2guXG4gICAgICA8L3A+XG4gICAgICA8Q291bnRlciBzdGFydD17M30gLz5cbiAgICA8L2Rpdj5cbiAgKTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxhQUFhLENBQ2IsU0FBUyxDQUFDLFFBQVEsUUFBUSxDQUFDO0FBQzNCLFNBQVMsRUFBRSxRQUFRLFFBQVEsQ0FBQztBQUM1QixPQUFPLE9BQU8sTUFBTSx3QkFBd0IsQ0FBQztBQUU3QyxlQUFlLFNBQVMsSUFBSSxHQUFHO0lBQzdCLHFCQUNFLEFBUEosQ0FBYSxDQU9SLEtBQUc7UUFBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLDJCQUEyQixDQUFDO3FCQUN6QyxBQVJOLENBQWEsQ0FRTixLQUFHO1FBQ0YsR0FBRyxFQUFDLFdBQVc7UUFDZixNQUFNLEVBQUMsT0FBTztRQUNkLEdBQUcsRUFBQyxvREFBb0Q7TUFDeEQsZ0JBQ0YsQUFiTixDQUFhLENBYU4sR0FBQztRQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDO09BQUUsNEZBR3BCLENBQUksZ0JBQ0osQUFqQk4sQ0FBYSxDQWlCTixPQUFPO1FBQUMsS0FBSyxFQUFFLENBQUM7TUFBSSxDQUNqQixDQUNOO0NBQ0gsQ0FBQSJ9