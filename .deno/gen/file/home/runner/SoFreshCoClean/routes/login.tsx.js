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
    }, "Welcome to login"), /*#__PURE__*/ h(Counter, {
        start: 3
    }));
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vaG9tZS9ydW5uZXIvU29GcmVzaENvQ2xlYW4vcm91dGVzL2xvZ2luLnRzeCJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiogQGpzeCBoICovXG5pbXBvcnQgeyBoIH0gZnJvbSBcInByZWFjdFwiO1xuaW1wb3J0IHsgdHcgfSBmcm9tIFwiQHR3aW5kXCI7XG5pbXBvcnQgeyBPQXV0aDJDbGllbnQgfSBmcm9tIFwib2F1dGgyXCI7XG5pbXBvcnQgQ291bnRlciBmcm9tIFwiLi4vaXNsYW5kcy9Db3VudGVyLnRzeFwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBIb21lKCkge1xuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3M9e3R3YHAtNCBteC1hdXRvIG1heC13LXNjcmVlbi1tZGB9PlxuICAgICAgPGltZ1xuICAgICAgICBzcmM9XCIvbG9nby5zdmdcIlxuICAgICAgICBoZWlnaHQ9XCIxMDBweFwiXG4gICAgICAgIGFsdD1cInRoZSBmcmVzaCBsb2dvOiBhIHNsaWNlZCBsZW1vbiBkcmlwcGluZyB3aXRoIGp1aWNlXCJcbiAgICAgIC8+XG4gICAgICA8cCBjbGFzcz17dHdgbXktNmB9PlxuICAgICAgICBXZWxjb21lIHRvIGxvZ2luXG4gICAgICA8L3A+XG4gICAgICA8Q291bnRlciBzdGFydD17M30gLz5cbiAgICA8L2Rpdj5cbiAgKTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxhQUFhLENBQ2IsU0FBUyxDQUFDLFFBQVEsUUFBUSxDQUFDO0FBQzNCLFNBQVMsRUFBRSxRQUFRLFFBQVEsQ0FBQztBQUU1QixPQUFPLE9BQU8sTUFBTSx3QkFBd0IsQ0FBQztBQUU3QyxlQUFlLFNBQVMsSUFBSSxHQUFHO0lBQzdCLHFCQUNFLEFBUkosQ0FBYSxDQVFSLEtBQUc7UUFBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLDJCQUEyQixDQUFDO3FCQUN6QyxBQVROLENBQWEsQ0FTTixLQUFHO1FBQ0YsR0FBRyxFQUFDLFdBQVc7UUFDZixNQUFNLEVBQUMsT0FBTztRQUNkLEdBQUcsRUFBQyxvREFBb0Q7TUFDeEQsZ0JBQ0YsQUFkTixDQUFhLENBY04sR0FBQztRQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDO09BQUUsa0JBRXBCLENBQUksZ0JBQ0osQUFqQk4sQ0FBYSxDQWlCTixPQUFPO1FBQUMsS0FBSyxFQUFFLENBQUM7TUFBSSxDQUNqQixDQUNOO0NBQ0gsQ0FBQSJ9