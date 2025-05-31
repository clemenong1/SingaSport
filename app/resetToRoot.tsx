import { useRouter } from "expo-router";
    import { useEffect } from "react";
    
    const ResetToRoot = () => {
      const router = useRouter();
    
      useEffect(() => {
        setTimeout(() => {
          router.replace("/");
        }, 0);
      });
      return <></>;
    };
    
    export default ResetToRoot;