import { MongoClient, ObjectID } from "mongodb";
import { GraphQLServer } from "graphql-yoga";

import "babel-polyfill";

//"mongodb+srv://sergio:123pez@cluster0-dikpx.gcp.mongodb.net/test?retryWrites=true&w=majority"

const usr = "sergio";
const pwd = "123pez";
const url = "cluster0-dikpx.gcp.mongodb.net/test?retryWrites=true&w=majority";

/**
 * Connects to MongoDB Server and returns connected client
 * @param {string} usr MongoDB Server user
 * @param {string} pwd MongoDB Server pwd
 * @param {string} url MongoDB Server url
 */
const connectToDb = async function(usr, pwd, url) {
  const uri = `mongodb+srv://${usr}:${pwd}@${url}`;
  
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  await client.connect();
  return client;
};

/**
 * Starts GraphQL server, with MongoDB Client in context Object
 * @param {client: MongoClinet} context The context for GraphQL Server -> MongoDB Client
 */
const runGraphQLServer = function(context) {
  const typeDefs = `
    type Query{

      getAuthor(id: ID!): Author
      getAuthors: [Author]

      getRecipe(id:ID!):Recipe
      getRecipe:[Recipe]

      getIngredient(id:ID!):Ingredient
      getIngredient:[Ingredient]
      
    }

    type Mutation{

      addAuthor(name: String!, mail: String!):Author!
      updateAuthor(id:ID!,name:String,age:Int):Author!
      removeAuthor(id:ID!):String

      addRecipe(title:String!,description:String!,author:String!,ingredients:[String!]):Recipe!
      
      
      
      addIngredient(name:String!,recipe:String!):Ingredient!


    }

    type Author{
      _id: ID!
      name: String!
      mail: String!
    }

    type Ingredient{
      _id: ID!
      name: String!
      recipes: [Recipe!]
    }

    type Recipe{
      _id: ID!
      title: String!
      description: String!
      date: String!
      author: Author!
      ingredients:[Ingredient!]
  }
    `;

  const resolvers = {

    Recipe:{

      ingredients:async (parent, args, ctx, info)=>{
  
        const rec= parent.title;
        const { client } = ctx;
        const db = client.db("blog");
        const collection = db.collection("ingredients");

         
        const result = await collection.find({"recipe": rec}).toArray();
        
        return result;
      },
  
      author:async (parent, args, ctx, info)=>{
  
        const author = parent.author;
        const { client } = ctx;
        const db = client.db("blog");
        const collection = db.collection("authors");
        const result = await collection.findOne({"name": author});

        return result;
  
      },
  
    },
  
    // Author:{
  
    //   recipes: (parent, args, ctx, info)=>{
  
    //     const name = parent.name;
    //     return recipesData.filter(obj => obj.author == name);

      
        
    //   },
  
    // },
  
    // Ingredient:{
  
    //   recipe: (parent, args, ctx, info)=>{
  
    //     const name = parent.recipe;
  
    //     return recipesData.filter(obj => obj.title == name);
  
    //   },
  
    // },

    Query: {

      getAuthor: async (parent, args, ctx, info) => {
        const { id } = args;
        const { client } = ctx;
        const db = client.db("blog");
        const collection = db.collection("authors");
        const result = await collection.findOne({ _id: ObjectID(id) });
        return result;
      },
      getAuthors: async (parent, args, ctx, info) => {
        const { client } = ctx;
        const db = client.db("blog");
        const collection = db.collection("authors");
        const result = await collection.find({}).toArray();
        return result;
      },

      getRecipe: async (parent, args, ctx, info) => {



      },

      getRecipes: async (parent, args, ctx, info) => {



      },

      getIngredient: async (parent, args, ctx, info) => {



      },

      getIngredients: async (parent, args, ctx, info) => {



      },

    },

    Mutation: {

      addAuthor: async (parent, args, ctx, info) => {
        const { name, mail } = args;
        const { client } = ctx;

        const db = client.db("blog");
        const collection = db.collection("authors");
        const result = await collection.insertOne({ name, mail });

        return {
          name,
          mail,
          _id: result.ops[0]._id
        };
      },
      updateAuthor:async (parent, args, ctx, info) => {


        const { client } = ctx;
        const db = client.db("blog");
        const collection = db.collection("authors");

        let result;
        let data = await collection.findOne({ _id: ObjectID(args.id)});

        if(args.name && args.age){

          result = await collection.updateOne({"_id":ObjectID(args.id)},{$set:{name:args.name,age:args.age}});
          result = await collection.findOne({ _id: ObjectID(args.id)});

          return result;

        } else if(args.name){

          result = await collection.updateOne({"_id":ObjectID(args.id)},{$set:{name:args.name,age:data.age}});
          result = await collection.findOne({ _id: ObjectID(args.id)});
          return result;

        }else if(args.age){

          result = await collection.updateOne({"_id":ObjectID(args.id)},{$set:{name:data.name,age:args.age}});
          result = await collection.findOne({ _id: ObjectID(args.id)});
          return result;
          
        }
      },
      removeAuthor:async(parent, args, ctx, info) => {

        const { client } = ctx;
        const db = client.db("blog");
        const collection = db.collection("authors");

        await collection.deleteOne({ _id: { $eq: ObjectID(args.id) } });

      },


      addRecipe: async (parent, args, ctx, info) => {

        //title:String!,description:String!,author:String!,ingredients:[String!]

        const { title, description,author,ingredients } = args;
        const { client } = ctx;

        const db = client.db("blog");
        let collection = db.collection("authors");

        let result;
        result = await collection.findOne({"name": author});        

        if(result){

          collection = db.collection("recipes");
          result = await collection.insertOne({title, description,author,ingredients });

          return {
            title,
            description,
            author,
            ingredients,
            _id: result.ops[0]._id
          };

        }

      },

      addIngredient: async (parent, args, ctx, info) => {

        //name:String!,recipe:String!

        const { name,recipe } = args;
        const { client } = ctx;

        const db = client.db("blog");
        const collection = db.collection("ingredients");
        const result = await collection.insertOne({name,recipe});

        return {
          name,
          recipe,
          _id: result.ops[0]._id
        };
      },


    }
  };

  const server = new GraphQLServer({ typeDefs, resolvers, context });
  const options = {
    port: 8000
  };

  try {
    server.start(options, ({ port }) =>
      console.log(
        `Server started, listening on port ${port} for incoming requests.`
      )
    );
  } catch (e) {
    console.info(e);
    server.close();
  }
};

const runApp = async function() {
  const client = await connectToDb(usr, pwd, url);
  console.log("Connect to Mongo DB");
  try {
    runGraphQLServer({ client });
  } catch (e) {
    client.close();
  }
};

runApp();
